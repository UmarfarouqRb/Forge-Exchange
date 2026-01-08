{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
  ];
  idx.extensions = [
    "svelte.svelte-vscode"
    "vue.volar"
  ];
  idx.previews = {
    previews = {
      web = {
        command = [
          "pnpm"
          "install"
          "&&"
          "pnpm"
          "dev"
        ];
        manager = "web";
      };
    };
  };
}