{
  inputs.nixpkgs.url = "nixpkgs";
  inputs.flake-parts.url = "github:hercules-ci/flake-parts";

  outputs = { flake-parts, ... }@inputs: 
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin" ];
      perSystem = { self', pkgs, ... }: {
        packages.tower-unite-cache = pkgs.callPackage ./.nix/packages/tower-unite-cache {};
        packages.default = self'.packages.tower-unite-cache;
      };
    };
}
