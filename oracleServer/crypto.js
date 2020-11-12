  
const createHash = require('create-hash');

module.exports.ripemd160 = (buffer) => { console.log("tralala");
  try {
    return createHash('rmd160')
      .update(buffer)
      .digest();
  } catch (err) {
    return createHash('ripemd160')
      .update(buffer)
      .digest();
  }
}

module.exports.sha1 = (buffer) => { console.log("tralala");
  return createHash('sha1')
    .update(buffer)
    .digest();
}

module.exports.sha256 = (buffer) => { console.log("tralala");
  return createHash('sha256')
    .update(buffer)
    .digest();
}

module.exports.hash160 = (buffer) => { console.log("tralala");
  return this.ripemd160(this.sha256(buffer));
}

module.exports.hash256 = (buffer) => { console.log("tralala");
  return this.sha256(this.sha256(buffer));
}