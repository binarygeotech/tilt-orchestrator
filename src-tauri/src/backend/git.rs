use std::process::Command;

pub async fn clone_repo(url: &str, target_dir: &str, branch: Option<&str>) -> std::io::Result<()> {
    let branch = branch.unwrap_or("main");
    let status = Command::new("git")
        .args(&["clone", url, target_dir, "--branch", branch])
        .status()?;

    if status.success() {
        Ok(())
    } else {
        Err(std::io::Error::new(std::io::ErrorKind::Other, "Git clone failed"))
    }
}
