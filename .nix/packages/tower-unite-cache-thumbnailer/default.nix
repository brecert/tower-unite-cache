{ lib
, stdenv
, imagemagick
, tower-unite-cache ? ../tower-unite-cache
}:

stdenv.mkDerivation {
  pname = "tower-unite-cache-thumbnailer";
  version = "0.1";

  src = ../../..;

  buildInputs = [
    imagemagick
    tower-unite-cache
  ];

  installPhase = ''
    runHook preInstall

    mv .linux $out
    chmod +x $out/bin/tower-unite-cache-thumbnailer
    
    runHook postInstall
  '';

  meta = with lib; {
    description = "extract images into thumbnails from tower unite cache files";
    homepage = "https://github.com/brecert/tower-unite-cache";
    license = licenses.mit;
    platforms = platforms.x86_64;
  };
}