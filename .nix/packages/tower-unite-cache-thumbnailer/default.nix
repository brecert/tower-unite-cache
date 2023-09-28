{ lib
, stdenv
, callPackage
, makeWrapper
, imagemagick
, tower-unite-cache ? callPackage ../tower-unite-cache {}
}:

stdenv.mkDerivation {
  pname = "tower-unite-cache-thumbnailer";
  version = "0.1";

  src = builtins.path {
    name = "tower-unite-cache";
    path = ../../..;
  };

  nativeBuildInputs = [
    makeWrapper
  ];

  buildInputs = [
    imagemagick
    tower-unite-cache
  ];

  dontBuild = true;

  installPhase = ''
    runHook preInstall

    mv .linux $out
    wrapProgram $out/bin/tower-unite-cache-thumbnailer \
      --prefix PATH : ${lib.makeBinPath [ imagemagick tower-unite-cache ]}

    substituteAllInPlace $out/share/thumbnailers/tower-unite-cache.thumbnailer
    
    runHook postInstall
  '';

  meta = with lib; {
    description = "extract images into thumbnails from tower unite cache files";
    homepage = "https://github.com/brecert/tower-unite-cache";
    license = licenses.mit;
    platforms = platforms.x86_64;
  };
}