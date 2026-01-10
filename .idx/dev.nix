{pkgs}: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
    pkgs.pnpm
  ];
  idx.extensions = [
    "svelte.svelte-vscode"
    "vue.volar"
  ];
  idx.previews = {
    previews = {
      web = {
        command = ["sh" "-c" "pnpm install -w && pnpm --filter frontend dev"];
        manager = "web";
      };
    };
  };
}