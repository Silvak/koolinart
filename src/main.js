const fs = require("fs");
const path = require("path");
const sha1 = require("sha1");
const mergeImages = require("merge-images");
const { Canvas, Image } = require("node-canvas");
const { MersenneTwister19937, bool, real } = require("random-js");

//multicore paquetes
//const os = require("os");
const cluster = require("cluster");

//DIRECTORIOS -----------------------
const basePath = process.cwd();
const buildDir = `${basePath}/build`;
const layersDir = `${basePath}/layers`;

//-------------------------------------------------------CONFIG FOLDERS--------------------------------------------------------------
const buildSetup = () => {
  `Verificamos carpetas y directorios 
  eliminamos archivos de /build si ya existe`;

  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true }); //<< next version of node {recursve: true} deprecation
  }

  fs.mkdirSync(buildDir);
  fs.mkdirSync(`${buildDir}/json`);
  fs.mkdirSync(`${buildDir}/images`);
  fs.writeFileSync(`${buildDir}/_metadata.text`, JSON.stringify(0));
  configLayers();
};

//config Json
const configLayers = () => {
  `configuracion de las capas, 
  conteo de sprites y administracion de direcciones`;
  let obj = {};

  fs.rmSync(layersDir + "/content.json", { recursive: true });

  if (fs.existsSync(`${layersDir}/content.json`)) {
    console.log("El archivo content.json ya existe \n");
  } else {
    try {
      let layerList = fs.readdirSync(layersDir);
      obj.layers = sortLayers(layerList);

      fs.writeFileSync(layersDir + "/content.json", JSON.stringify(obj));
      console.log("Se configuro content.json correctamente \n");
    } catch (error) {
      console.log("ocurrio un error al configurar content.json \n");
    }
  }
};

//ordenar capas
const sortLayers = (layerList) => {
  let layers = [];
  layerList.forEach((folderName) => {
    if (!folderName.split(".")[1]) {
      let fileList = fs.readdirSync(`${layersDir}/${folderName}`);
      let newList = [];

      fileList.forEach((fileName) => {
        if (fileName.split(".")[1] == "png") {
          newList.push({
            name: fileName.split(".")[0],
            file: `${folderName}/${fileName}`,
            weight: 1,
          });
        } else {
          console.log("el archivo no es un .png");
        }
      });
      //
      let newObj = {
        name: folderName,
        probability: 0.9999,
        options: newList,
      };
      layers.push(newObj);
    }
  });
  return layers;
};

//------------------------------------------------------Check DNA---------------------------------------------------------------
const checkDna = (dna1) => {
  let dnaVar = sha1(dna1);
  const dnaData = fs.readFileSync(`${buildDir}/_metadata.text`, "utf8");
  let dnaDataList = dnaData.split(",");
  let checkDna = dnaDataList.find((element) => element == dnaVar);
  if (checkDna != undefined) {
    return true;
  } else {
    return false;
  }
};

//------------------------------------------------------GENERATIVE MAIN APP---------------------------------------------------------------
async function generateNFTs(num, layersPath, outputPath, numCPUs) {
  const content = require(layersPath + "/content.js"); //content
  let generated = new Set();

  for (let tokenId = 0; tokenId < num; tokenId++) {
    if (tokenId % numCPUs === cluster.worker.id - 1) {
      console.log(`Generando NFT #${tokenId}, worker[${cluster.worker.id}] …`);

      let selection = randomlySelectLayers(layersPath, content.layers);
      const traitsStr = JSON.stringify(selection.selectedTraits);

      //generated.has(traitsStr)
      if (checkDna(traitsStr) || generated.has(traitsStr)) {
        console.log("Duplicado detectado. Reintentado …");
        tokenId--;
        continue;
      } else {
        //image
        generated.add(traitsStr);
        await mergeLayersAndSave(
          selection.images,
          path.join(outputPath + "/images", `${tokenId}.png`)
        );

        //JSON
        let metadata = generateMetadata(tokenId, selection.selectedTraits);
        //add _metadata hash
        fs.appendFileSync(
          `${outputPath}/_metadata.text`,
          "," + metadata.dna,
          (err) => {
            if (err) throw err;
            console.log('The "data to append" was appended to file!');
          }
        );
        //create json file
        fs.writeFileSync(
          path.join(outputPath + "/json", `${tokenId}.json`),
          JSON.stringify(metadata)
        );
      }
    }
  }
}

//------------------------------------------------------GENERATED METADATA--------------------------------------------------------------
function generateMetadata(tokenId, traits) {
  attributes = [];
  for (const [trait_type, value] of Object.entries(traits)) {
    attributes.push({ trait_type, value });
  }

  let dna = {};
  attributes.forEach((element) => {
    dna[element.trait_type] = element.value;
  });

  //metadata <<<<<<<<<<<<<  <<<<<<< config
  return {
    image: "<%IMAGE_URL%>",
    //name: `NFT #${tokenId}`,
    dna: sha1(JSON.stringify(dna)),
    external_url: "https://",
    description: "nft",
    attributes: attributes,
  };
}

//----------------------------------------------------RANDOM SELECTE LAYERS-------------------------------------------------------------
function randomlySelectLayers(layersPath, layers) {
  const mt = MersenneTwister19937.autoSeed();
  let images = [];
  let selectedTraits = {};

  for (const layer of layers) {
    if (bool(layer.probability)(mt)) {
      let selected = pickWeighted(mt, layer.options);
      selectedTraits[layer.name] = selected.name;
      images.push(path.join(layersPath, selected.file));
    }
  }

  return {
    images,
    selectedTraits,
  };
}

function pickWeighted(mt, options) {
  const weightSum = options.reduce((acc, option) => {
    return acc + (option.weight ?? 1.0);
  }, 0);

  const r = real(0.0, weightSum, false)(mt);

  let summedWeight = 0.0;
  for (const option of options) {
    summedWeight += option.weight ?? 1.0;
    if (r <= summedWeight) {
      return option;
    }
  }
}

//----------------------------------------------------MERGE AND SAVE IMAGES-------------------------------------------------------------
async function mergeLayersAndSave(layers, outputFile) {
  const image = await mergeImages(layers, { Canvas: Canvas, Image: Image });
  saveBase64Image(image, outputFile);
}

function saveBase64Image(base64PngImage, filename) {
  let base64 = base64PngImage.split(",")[1];
  let imageBuffer = Buffer.from(base64, "base64");
  fs.writeFileSync(filename, imageBuffer);
}

// export main modules
module.exports = { buildSetup, generateNFTs };
