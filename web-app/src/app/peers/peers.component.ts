import { Component, OnInit } from '@angular/core';
import { BlockchainService } from '../app.service';
import { Peer } from '../peer';

@Component({
  selector: 'app-peers',
  templateUrl: './peers.component.html',
  styleUrls: ['./peers.component.css']
})
export class PeersComponent implements OnInit {
  peers: Peer[];

  constructor(private blockchainService: BlockchainService) { }

  ngOnInit() {
    this.getPeers();
  }

  getPeers(): void {
    this.blockchainService.getPeers()
    .subscribe(peers => this.peers = peers)
  }

}
