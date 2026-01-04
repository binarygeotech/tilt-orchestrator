use serde::{de::DeserializeOwned, Serialize};
use std::{fs, path::Path};

use crate::backend::errors::AppError;

pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<T, AppError> {
    let data = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&data)?)
}

pub fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(path, serde_json::to_string_pretty(value)?)?;
    Ok(())
}

pub fn rename_project(
    current_dir: &Path,
    new_dir: &Path,
    new_name: &String,
) -> Result<(), AppError> {
    if fs::exists(new_dir)? {
        panic!("Project with the same name already exists");
        // Err(e) -> println!("Project with the same name already exists: {}", new_name);
    }

    if !fs::exists(current_dir)? {
        panic!("Project operation is not valid",);
        // Err(e) => println!("Project operation is not valid");
    }

    let _ = fs::rename(current_dir, new_name);

    Ok(())
}

pub fn assert_service_path(service_path: &Path) -> Result<bool, AppError> {
    if !fs::exists(service_path)? {
        fs::create_dir_all(service_path)?
    }

    Ok(true)
}
