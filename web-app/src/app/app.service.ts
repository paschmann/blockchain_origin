import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { Block } from './block';
import { Peer } from './peer';


@Injectable({ providedIn: 'root' })

export class BlockchainService {

  private serverUrl = 'http://localhost:3001/api/v1';  // URL to web api

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient) { }

  /** GET blockchain from the server */
  getBlockchain (): Observable<Block[]> {
    return this.http.get<Block[]>(this.serverUrl + "/blocks")
      .pipe(
        catchError(this.handleError<Block[]>('getBlockchain', []))
      );
  }

  /** GET blockchain from the server */
  getPeers (): Observable<Peer[]> {
    return this.http.get<Peer[]>(this.serverUrl + "/peers")
      .pipe(
        catchError(this.handleError<Peer[]>('getPeers', []))
      );
  }

  //////// Save methods //////////

  /** POST: add a new hero to the server */
  addBlock (data: any): Observable<any> {
    return this.http.post<any>(this.serverUrl + "/blocks/mine", data, this.httpOptions).pipe(
      catchError(this.handleError<any>('addBlock'))
    );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T> (operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {

      // TODO: send the error to remote logging infrastructure
      console.error(error); // log to console instead

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }
}