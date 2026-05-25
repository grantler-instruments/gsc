fn main() {
    #[cfg(feature = "ndi")]
    verify_ndi_sdk_for_build();
    tauri_build::build();
}

#[cfg(feature = "ndi")]
fn verify_ndi_sdk_for_build() {
    use std::path::Path;

    let from_env = std::env::var("NDI_SDK_DIR").ok();
    let candidates: Vec<&str> = if let Some(ref dir) = from_env {
        vec![dir.as_str()]
    } else {
        vec![
            "/Library/NDI 6 SDK",
            "/Library/NDI SDK for Apple",
            "/Library/NDI SDK for macOS",
            "/Library/NDI SDK",
            "/Applications/NDI 6 SDK",
            "/Applications/NDI SDK for Apple",
        ]
    };

    let header_names = [
        "Processing.NDI.Lib.h",
        "Processing.NDI.lib.h",
        "Processing.ndi.lib.h",
    ];

    for sdk_root in candidates {
        let include = Path::new(sdk_root).join("include");
        if header_names
            .iter()
            .any(|name| include.join(name).is_file())
        {
            println!("cargo:rustc-env=GSC_NDI_SDK_DIR={sdk_root}");
            return;
        }
    }

    eprintln!(
        "\n\
         ╔══════════════════════════════════════════════════════════════════╗\n\
         ║  NDI SDK not found (required for --features ndi)                 ║\n\
         ╠══════════════════════════════════════════════════════════════════╣\n\
         ║  1. Download the NDI SDK from https://ndi.video/sdk/             ║\n\
         ║  2. Run the macOS installer (accept the license).                 ║\n\
         ║  3. Point the build at the SDK root, e.g. in src-tauri/.cargo/    ║\n\
         ║     config.toml:                                                   ║\n\
         ║       [env]                                                        ║\n\
         ║       NDI_SDK_DIR = \"/Library/NDI 6 SDK\"                         ║\n\
         ║  4. Re-run: npm run tauri:dev:ndi                                  ║\n\
         ║                                                                    ║\n\
         ║  Without the SDK, use the default build (no NDI):                  ║\n\
         ║       npm run tauri dev                                            ║\n\
         ╚══════════════════════════════════════════════════════════════════╝\n"
    );

    if let Ok(dir) = from_env {
        panic!(
            "NDI_SDK_DIR is set to \"{dir}\" but no Processing.NDI.Lib.h was found under {dir}/include"
        );
    }

    panic!(
        "NDI SDK not found. Install from https://ndi.video/sdk/ and set NDI_SDK_DIR, \
         or build without NDI: npm run tauri dev"
    );
}
