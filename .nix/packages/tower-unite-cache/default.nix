{ lib
, stdenv
, odin
}:

stdenv.mkDerivation {
  pname = "tower-unite-cache";
  version = "0.1";

  src = builtins.path {
    name = "tower-unite-cache";
    path = ../../..;
  };


  nativeBuildInputs = [
    odin
  ];

  buildPhase = ''
    runHook preBuild

    odin build src/ -collection:shared=src -out:tower-unite-cache -o:speed
    
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    mkdir -p $out/bin
    mv tower-unite-cache $out/bin/tower-unite-cache
    
    runHook postInstall
  '';

  meta = with lib; {
    description = "extract info from tower unite cache files";
    homepage = "https://github.com/brecert/tower-unite-cache";
    license = licenses.mit;
    platforms = platforms.x86_64;
  };
}