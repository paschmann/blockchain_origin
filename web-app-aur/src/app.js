import {HttpClient} from 'aurelia-fetch-client';

export class App {
  constructor() {
    this.heading = 'Todos';
    this.blockchain = []; 
    this.prodName = '';
    this.loadBlockchain();
  }

  loadBlockchain() {
    let httpClient = new HttpClient();
    httpClient.fetch('http://localhost:3001/api/v1/blocks')
    .then(data => {
      console.log(data);
    });
  }

  addBlock() {
    if (this.prodName) {
      this.blockchain.push({
        prodName: this.prodName
      });
      this.prodName = '';
    }
  }
}
