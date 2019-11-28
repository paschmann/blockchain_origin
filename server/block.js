class Block {
    constructor(index, previousHash, timestamp, data, hash, sourceNode) {
        this.index = index;
        this.previousHash = previousHash.toString();
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash.toString();
        this.sourceNode = sourceNode;
    }

    static genesis () {
        return new Block(0, "0", 1465154705.232, "Genesis Block", "816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7", "");
    }
}

module.exports = Block;