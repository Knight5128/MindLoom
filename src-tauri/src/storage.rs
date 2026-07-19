//! 本地文件存储层：笔记 Markdown 文件、settings.json、meta.json、备份与回收站。
//! 全部数据位于 `appDataDir()`（Windows: %APPDATA%\com.mindloom.app\），
//! 布局与红线见 docs/LOCAL_STORAGE_SPEC.md。

use std::fs;
use std::path::PathBuf;
use std::process::Command;

use chrono::{DateTime, Local, SecondsFormat, TimeZone};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
    #[serde(default)]
    pub mood: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub content: String,
}

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn sub_dir(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let dir = data_dir(app)?.join(name);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn notes_dir(app: &AppHandle) -> Result<PathBuf, String> {
    sub_dir(app, "notes")
}

fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    sub_dir(app, "backups")
}

fn trash_dir(app: &AppHandle) -> Result<PathBuf, String> {
    sub_dir(app, ".trash")
}

fn ms_to_rfc3339(ms: i64) -> String {
    Local
        .timestamp_millis_opt(ms)
        .single()
        .map(|d| d.to_rfc3339_opts(SecondsFormat::Millis, false))
        .unwrap_or_default()
}

fn rfc3339_to_ms(s: &str) -> Option<i64> {
    DateTime::parse_from_rfc3339(s.trim())
        .ok()
        .map(|d| d.timestamp_millis())
}

fn sanitize_id(id: &str) -> String {
    id.chars().filter(|c| c.is_ascii_alphanumeric()).collect()
}

/// 文件名由 createdAt + id 决定，因此对同一条笔记稳定不变。
fn note_rel_path(id: &str, created_at_ms: i64) -> Result<PathBuf, String> {
    let dt = Local
        .timestamp_millis_opt(created_at_ms)
        .single()
        .ok_or_else(|| "invalid createdAtMs".to_string())?;
    let year = dt.format("%Y").to_string();
    let name = format!("{}_{}.md", dt.format("%Y-%m-%d_%H%M"), sanitize_id(id));
    Ok(PathBuf::from(year).join(name))
}

fn note_to_markdown(note: &Note) -> String {
    let mut out = String::from("---\n");
    out.push_str(&format!("id: {}\n", sanitize_id(&note.id)));
    out.push_str(&format!("created: {}\n", ms_to_rfc3339(note.created_at_ms)));
    out.push_str(&format!("updated: {}\n", ms_to_rfc3339(note.updated_at_ms)));
    if let Some(m) = &note.mood {
        if !m.is_empty() {
            out.push_str(&format!("mood: {}\n", m.replace('\n', " ")));
        }
    }
    if !note.tags.is_empty() {
        out.push_str(&format!("tags: {}\n", note.tags.join(", ")));
    }
    out.push_str("---\n\n");
    out.push_str(&note.content);
    out
}

fn parse_note(raw: &str) -> Option<Note> {
    let text = raw.replace("\r\n", "\n");
    let rest = text.strip_prefix("---\n")?;
    let end = rest.find("\n---\n")?;
    let header = &rest[..end];
    let body = &rest[end + "\n---\n".len()..];
    // 写入时在 frontmatter 后固定加一个空行，读取时剥掉
    let content = body.strip_prefix('\n').unwrap_or(body);

    let mut id = String::new();
    let mut created: Option<i64> = None;
    let mut updated: Option<i64> = None;
    let mut mood: Option<String> = None;
    let mut tags: Vec<String> = Vec::new();

    for line in header.lines() {
        let Some((k, v)) = line.split_once(':') else {
            continue;
        };
        let v = v.trim();
        match k.trim() {
            "id" => id = v.to_string(),
            "created" => created = rfc3339_to_ms(v),
            "updated" => updated = rfc3339_to_ms(v),
            "mood" => {
                if !v.is_empty() {
                    mood = Some(v.to_string());
                }
            }
            "tags" => {
                tags = v
                    .split(',')
                    .map(|t| t.trim().to_string())
                    .filter(|t| !t.is_empty())
                    .collect();
            }
            _ => {}
        }
    }

    if id.is_empty() {
        return None;
    }
    let created = created?;
    Some(Note {
        id,
        created_at_ms: created,
        updated_at_ms: updated.unwrap_or(created),
        mood,
        tags,
        content: content.to_string(),
    })
}

#[tauri::command]
pub fn list_notes(app: AppHandle) -> Result<Vec<Note>, String> {
    let dir = notes_dir(&app)?;
    let mut notes = Vec::new();
    let years = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for year in years.flatten() {
        let year_path = year.path();
        if !year_path.is_dir() {
            continue;
        }
        let Ok(files) = fs::read_dir(&year_path) else {
            continue;
        };
        for file in files.flatten() {
            let path = file.path();
            if path.extension().and_then(|e| e.to_str()) != Some("md") {
                continue;
            }
            if let Ok(raw) = fs::read_to_string(&path) {
                if let Some(note) = parse_note(&raw) {
                    notes.push(note);
                }
            }
        }
    }
    notes.sort_by(|a, b| b.updated_at_ms.cmp(&a.updated_at_ms));
    Ok(notes)
}

#[tauri::command]
pub fn save_note(app: AppHandle, note: Note) -> Result<(), String> {
    let dir = notes_dir(&app)?;
    let path = dir.join(note_rel_path(&note.id, note.created_at_ms)?);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, note_to_markdown(&note)).map_err(|e| e.to_string())
}

/// 软删除：移入 .trash/，文件名前缀删除时刻毫秒时间戳，供 purge_trash 判定保留期。
#[tauri::command]
pub fn delete_note(app: AppHandle, id: String, created_at_ms: i64) -> Result<(), String> {
    let dir = notes_dir(&app)?;
    let src = dir.join(note_rel_path(&id, created_at_ms)?);
    if !src.exists() {
        return Ok(());
    }
    let trash = trash_dir(&app)?;
    let file_name = src
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}.md", sanitize_id(&id)));
    let dst = trash.join(format!("{}_{}", Local::now().timestamp_millis(), file_name));
    fs::rename(&src, &dst).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn purge_trash(app: AppHandle, days: u32) -> Result<u32, String> {
    let trash = trash_dir(&app)?;
    let cutoff = Local::now().timestamp_millis() - (days as i64) * 86_400_000;
    let mut removed = 0u32;
    for entry in fs::read_dir(&trash).map_err(|e| e.to_string())?.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if let Some((ts, _)) = name.split_once('_') {
            if let Ok(ms) = ts.parse::<i64>() {
                if ms < cutoff && fs::remove_file(entry.path()).is_ok() {
                    removed += 1;
                }
            }
        }
    }
    Ok(removed)
}

fn read_json_file(app: &AppHandle, name: &str) -> Result<Option<String>, String> {
    let path = data_dir(app)?.join(name);
    if !path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&path).map(Some).map_err(|e| e.to_string())
}

fn write_json_file(app: &AppHandle, name: &str, json: &str) -> Result<(), String> {
    let path = data_dir(app)?.join(name);
    fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_settings(app: AppHandle) -> Result<Option<String>, String> {
    read_json_file(&app, "settings.json")
}

#[tauri::command]
pub fn write_settings(app: AppHandle, json: String) -> Result<(), String> {
    write_json_file(&app, "settings.json", &json)
}

#[tauri::command]
pub fn read_meta(app: AppHandle) -> Result<Option<String>, String> {
    read_json_file(&app, "meta.json")
}

#[tauri::command]
pub fn write_meta(app: AppHandle, json: String) -> Result<(), String> {
    write_json_file(&app, "meta.json", &json)
}

const DAILY_BACKUP_PREFIX: &str = "mindloom-backup-";
const DAILY_BACKUP_KEEP: usize = 7;

/// 当日备份已存在则跳过；写入后对 mindloom-backup-*.json 滚动清理，仅保留最近 7 份。
#[tauri::command]
pub fn write_daily_backup_if_needed(app: AppHandle, json: String) -> Result<bool, String> {
    let dir = backups_dir(&app)?;
    let today = Local::now().format("%Y%m%d").to_string();
    let path = dir.join(format!("{}{}.json", DAILY_BACKUP_PREFIX, today));
    if path.exists() {
        return Ok(false);
    }
    fs::write(&path, json).map_err(|e| e.to_string())?;

    let mut daily: Vec<PathBuf> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .flatten()
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.starts_with(DAILY_BACKUP_PREFIX) && n.ends_with(".json"))
                .unwrap_or(false)
        })
        .collect();
    daily.sort();
    while daily.len() > DAILY_BACKUP_KEEP {
        let oldest = daily.remove(0);
        let _ = fs::remove_file(oldest);
    }
    Ok(true)
}

/// IndexedDB → 文件迁移前的一次性全量备份，不参与滚动清理。
#[tauri::command]
pub fn write_pre_migration_backup(app: AppHandle, json: String) -> Result<String, String> {
    let dir = backups_dir(&app)?;
    let path = dir.join(format!(
        "pre-migration-{}.json",
        Local::now().timestamp_millis()
    ));
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// 导出：路径来自系统「另存为」对话框（用户显式选择）。
#[tauri::command]
pub fn export_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

/// 导入：路径来自系统「打开」对话框（用户显式选择）。
#[tauri::command]
pub fn read_text_file_at(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_data_dir(app: AppHandle) -> Result<(), String> {
    let dir = data_dir(&app)?;
    #[cfg(target_os = "windows")]
    Command::new("explorer")
        .arg(&dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(&dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(all(unix, not(target_os = "macos")))]
    Command::new("xdg-open")
        .arg(&dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
