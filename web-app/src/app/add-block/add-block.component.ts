import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from  '@angular/forms';
import { BlockchainService } from '../app.service';

@Component({
  selector: 'app-add-block',
  templateUrl: './add-block.component.html',
  styleUrls: ['./add-block.component.css']
})
export class AddBlockComponent implements OnInit {
  prodName = "Chicken Soup";
  serialNo = "123121";
  expDate = "1/1/2020";
  addition;
  
  constructor(private blockchainService: BlockchainService) {
    
  }

  ngOnInit() {
    
  }

  onSubmit() {
    let data = {
      data: {
        prodName: this.prodName,
        expDate: this.expDate,
        serialNo: this.serialNo
      }
    }
    this.blockchainService.addBlock(data)
    .subscribe(addition => this.addition);
  }

}
