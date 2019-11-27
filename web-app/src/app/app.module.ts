import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule }    from '@angular/common/http';

import { AppComponent } from './app.component';
import { PeersComponent } from './peers/peers.component';
import { BlockchainComponent } from './blockchain/blockchain.component';
import { AddBlockComponent } from './add-block/add-block.component';

@NgModule({
  declarations: [
    AppComponent,
    PeersComponent,
    BlockchainComponent,
    AddBlockComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
