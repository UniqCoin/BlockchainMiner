const axios = require('axios')
const CryptoJS = require('crypto-js')

const minerAddress = '492bceee1efc35da07362ba7f523a8ba45469b54'
const getMiningJob = () => {
    return axios.get('http://stormy-everglades-34766.herokuapp.com/mining/get-mining-job/:address')
}

const getBlockByIndex = (index) => {
    return axios.get(`http://stormy-everglades-34766.herokuapp.com/blocks/${index.toString()}`)
}

const calculateHash = (index, prevHash, timestamp, nonce) => {
    return CryptoJS.SHA256(index + prevHash + timestamp + nonce).toString()
}

const postBlock = (blockData) => {
    const options = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify(blockData),
      url: 'http://stormy-everglades-34766.herokuapp.com/mining/submit-mined-block',
    }

    return axios(options)
}

const mineBlock = async () => {
    const response = await getMiningJob()
    console.log(response.data)
    const block = response.data
    const { index, difficulty, blockHash } = block
    const prevIndex = index - 1
    const nextIndex = index
    let prevBlock = await getBlockByIndex(prevIndex)
    prevBlock = prevBlock.data
    let nonce = 0
    let nextTimeStamp = new Date().getTime() / 1000
    let nextHash = calculateHash(nextIndex, prevBlock.blockHash, nextTimeStamp, nonce)

    while(nextHash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
        nonce++
        nextTimeStamp = new Date().getTime() / 1000
        nextHash = calculateHash(nextIndex, prevBlock.blockHash, nextTimeStamp, block, nonce)
        console.log("\"index\":" + nextIndex + ",\"previousHash\":"+prevBlock.blockHash+
        "\"timestamp\":"+nextTimeStamp+"data\":"+block+
        ",\\xlb[33mhash: " + nextHash + "\\xlb[0m," + "\"difficulty\":"+difficulty+
        " \\xlb[33mnonce: " +nonce + " \\xlb[0m ")
    } 
    console.log(`Success: ${nextHash}`)
    const result = {
          blockDataHash: block.blockDataHash,
          dateCreated:  nextTimeStamp,
          nonce,
          blockHash: nextHash
    }
    return result
}

const minedBlock = mineBlock()
const result = postBlock(minedBlock)
console.log(result)