const basePath = process.cwd();
const { buildSetup, generateNFTs } = require(`${basePath}/src/main.js`);
//multicore paquetes
const os = require("os");
const cluster = require("cluster");
const numCPUs = os.cpus().length / 2;

//
//DIRECTORIOS
const buildDir = `${basePath}/build`;
const layersDir = `${basePath}/layers`;

//Cantidad de NFTs a generar
const quantity = 1000; // << cantidad de NFTs
//

//---------------------------App-------------------------------
(() => {
  if (cluster.isMaster) {
    buildSetup(); //config folders

    console.log(`Primary ${process.pid} is running`);
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
    //console.log(`worket ${[process.pid]} ${cluster.worker.id}`);
    generateNFTs(quantity, layersDir, buildDir, numCPUs);
  }
})();
