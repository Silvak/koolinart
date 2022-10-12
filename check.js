const fs = require("fs");

const basePath = process.cwd();
const buildDir = `${basePath}/build`;

//Recibe un array de numeros desordenados referentes a nombres de carpetas y los ordena de menor a mayor (devuelve un array ordenado)
function sortFiles(list, outputFile) {
  let newSortArr = [];
  let newObjList = [];

  list.forEach((element) => {
    newSortArr.push(element.split(".")[0]);
  });
  newSortArr.sort(function (a, b) {
    return a - b;
  });

  newSortArr.forEach((element) => {
    let readFile = JSON.parse(
      fs.readFileSync(`${outputFile}/json/${element}.json`, "utf-8")
    );
    newObjList.push({ id: element, dna: readFile.dna });
  });
  return newObjList;
}

//Renombra los archivos de la carpeta de salida partiendo de la longitud del array eje:1,2,3,4,5 ...
function renameFiles(arr, outputFile) {
  for (let i = 0; i < arr.length; i++) {
    if (fs.existsSync(`${outputFile}/json/${arr[i].id}.json`)) {
      fs.renameSync(
        `${outputFile}/json/${arr[i].id}.json`,
        `${outputFile}/json/n${i}.json`
      );
      fs.renameSync(
        `${outputFile}/images/${arr[i].id}.png`,
        `${outputFile}/images/n${i}.png`
      );
    }
  }
  return console.log("Archivos renombrados correctamente");
}

//Recibe un array de entrada y
function removeDuplicate(arr, arrFiltered, outputFile) {
  for (let i = 0; i < arr.length; i++) {
    let d = arrFiltered.includes(arr[i]);
    if (!d && fs.existsSync(`${outputFile}/json/${arr[i].id}.json`)) {
      try {
        fs.rmSync(`${outputFile}/json/${arr[i].id}.json`);
        fs.rmSync(`${outputFile}/images/${arr[i].id}.png`);
      } catch (error) {
        console.log(JSON.parse(error));
      }
    }
  }
  return console.log(`Duplicados removidos `);
}

//

function makeMacroData() {}

//---------------------------------------------MAIN-----------------------------------------------------
function checkCopys(outputFile) {
  const dataJson = fs.readdirSync(`${outputFile}/json`);
  const dataImages = fs.readdirSync(`${outputFile}/images`);

  //lista ordenada (arr)
  let arr = sortFiles(dataJson, outputFile);

  //lista ordenada sin duplicados (arrFiltered)
  var hash = {};
  let arrFiltered = arr.filter((element) =>
    hash[element.dna] ? false : (hash[element.dna] = true)
  );

  console.log(
    `Se detectaron ${arr.length - arrFiltered.length} elementos duplicados`
  );

  removeDuplicate(arr, arrFiltered, outputFile);
  renameFiles(arrFiltered, outputFile);

  if (fs.existsSync(`${outputFile}/metadata.json`)) {
    fs.rmSync(`${outputFile}/metadata.json`);
  }

  /*
  let metadataJson = {};
  for (let i = 0; i < arrFiltered.length; i++) {
    if (fs.existsSync(`${outputFile}/json/${arrFiltered[i].id}.json`)) {
      let dd = JSON.parse(
        fs.readFileSync(`${outputFile}/json/${arrFiltered[i].id}.json`, "utf-8")
      );
      metadataJson = dd;
    }
    //metadataJson.push(dataJson);
  }

  fs.writeFileSync(
    `${buildDir}/metadata.json`,
    JSON.stringify({ ...metadataJson })
  ); //<<<< almacenar satos de todos los nft
  */
  //console.log("metadata.json se creo correctamente");
}

checkCopys(buildDir);
