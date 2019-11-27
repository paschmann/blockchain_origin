import { Component, OnInit } from '@angular/core';
import { Block } from '../block';
import { BlockchainService } from '../app.service';

@Component({
  selector: 'app-blockchain',
  templateUrl: './blockchain.component.html',
  styleUrls: ['./blockchain.component.css']
})
export class BlockchainComponent implements OnInit {
  blockchain: Block[];

  constructor(private blockchainService: BlockchainService) { }

  ngOnInit() {
    this.getBlockchain();
  }

  getBlockchain(): void {
    this.blockchainService.getBlockchain()
    .subscribe(blockchain => this.blockchain = blockchain)
  }

}
