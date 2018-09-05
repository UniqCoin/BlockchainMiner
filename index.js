const axios = require("axios");
const CryptoJS = require("crypto-js");
const cluster = require("cluster");
const os = require("os");
const numWorkers = os.cpus().length;
const minerAddress = "492bceee1efc35da07362ba7f523a8ba45469b54";
const getMiningJob = () => {
  return axios.get(
    "http://stormy-everglades-34766.herokuapp.com/mining/get-mining-job/:address"
  );
};

const getBlockByIndex = index => {
  return axios.get(
    `http://stormy-everglades-34766.herokuapp.com/blocks/${index.toString()}`
  );
};

const calculateHash = (prevHash, timestamp, nonce) => {
  const data = `${prevHash}|${timestamp}|${nonce}`;
  return CryptoJS.SHA256(data).toString();
};

const postBlock = blockData => {
  const options = {
    method: "POST",
    headers: { "content-type": "application/json" },
    data: JSON.stringify(blockData),
    url:
      "http://stormy-everglades-34766.herokuapp.com/mining/submit-mined-block"
  };

  return axios(options);
};

const mineBlock = async () => {
  const response = await getMiningJob();

  process.send({ text: 'MINING_JOB', workersMiningIndex: response.data.index })

  const block = response.data;
  const { index, difficulty, blockDataHash } = block;
  const prevIndex = index - 1;
  const nextIndex = index;
  let prevBlock = await getBlockByIndex(prevIndex);
  prevBlock = prevBlock.data;
  let nonce = 0;
  let nextTimeStamp = new Date().getTime() / 1000;
  let nextHash = calculateHash(blockDataHash, nextTimeStamp, nonce);

  id = Number(process.env.id);
  nonce = id;
  while (nextHash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
    nonce += 1;
    nextTimeStamp = new Date().getTime() / 1000;
    nextHash = calculateHash(blockDataHash, nextTimeStamp, nonce);
    // console.log(
    //   '"index":' +
    //     nextIndex +
    //     ',"previousHash":' +
    //     prevBlock.blockHash +
    //     '"timestamp":' +
    //     nextTimeStamp +
    //     'data":' +
    //     block +
    //     ",\\xlb[33mhash: " +
    //     nextHash +
    //     "\\xlb[0m," +
    //     '"difficulty":' +
    //     difficulty +
    //     " \\xlb[33mnonce: " +
    //     nonce +
    //     " \\xlb[0m "
    // );
  }

  const result = {
    blockDataHash: block.blockDataHash,
    dateCreated: nextTimeStamp,
    nonce,
    blockHash: nextHash
  };

  return result;
};

(async function() {
  if (cluster.isMaster) {
    let workersMiningIndex
    const startWorkers = () => {
      for (let a = 0; a < numWorkers; a++) {
        const worker = cluster.fork({ id: a * 100000 });
        worker.on('message', async (msg) => {
          if (msg.text === 'DONE') {
            const response = await getMiningJob()
            workersMiningIndex = response.data.index
            endWorkers()
            cluster.fork({ id: 0 })
          } else if (msg.text === 'MINING_JOB') {
            workersMiningIndex = msg.workersMiningIndex
          }
        })
      }
    }
    const endWorkers = () => {
      for (id in cluster.workers) {
        cluster.workers[id].kill()
      }
    }
    const resetWorkers = () => {
      endWorkers()
      startWorkers()
    }

    startWorkers()

    setInterval(async () => {
      const response = await getMiningJob();
      const block = response.data
      const currentMiningIndex = block.index

      if (workersMiningIndex !== currentMiningIndex) {
        resetWorkers()
        workersMiningIndex = currentMiningIndex
      }
    }, 2000)
  } else {
    const minedBlock = await mineBlock();

    try {
      const result = await postBlock(minedBlock);
      console.log(result.data.message)
    } catch (err) {
      console.log(err.response.data)
    }

    process.send({ text: 'DONE' })
  }
})();

