#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;

/// Abre um endereço https no navegador padrão (só https, sem espaços nem aspas; o Windows recebe o endereço como argumento, sem shell).
#[tauri::command]
fn abrir_link(url: String) -> Result<(), String> {
    if !url.starts_with("https://") || url.chars().any(|c| c.is_whitespace() || c == '"' || c == '\'' || c == '<' || c == '>') {
        return Err("Endereço não permitido.".into());
    }
    let mut c = if cfg!(windows) { Command::new("explorer") } else if cfg!(target_os = "macos") { Command::new("open") } else { Command::new("xdg-open") };
    c.arg(&url).spawn().map(|_| ()).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![abrir_link])
        .run(tauri::generate_context!())
        .expect("não foi possível iniciar o Voxix");
}
