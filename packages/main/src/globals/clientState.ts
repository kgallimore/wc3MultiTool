import {Global} from '../globalBase';

import type {PickByValue} from './../utility';
import {lookup} from 'fast-geoip';

export interface ClientState {
  currentStep: string;
  currentStepProgress: number;
  vpnActive: 'us' | 'eu' | false;
  currentIP: string;
  ipCountry: string;
  ipIsEU: boolean;
}

class ClientStateSingle extends Global {
  private _values: ClientState;
  constructor() {
    super('Client State');
    this._values = {
      currentStep: '',
      currentStepProgress: 0,
      vpnActive: false,
      currentIP: '',
      ipCountry: '',
      ipIsEU: false,
    };
    this.getPublicIP().then(() => {
      this.info('Public IP info fetched.');
    });
  }

  get values() {
    return this._values;
  }

  set values(value: ClientState) {
    throw new Error('Can not set values directly. Use updateClientState.');
  }

  async getPublicIP(): Promise<{
    current: string;
    country: string;
    isEU: boolean;
    old?: string;
  } | null> {
    let ip: string = '';
    try{
      const res = await fetch('https://ws.trenchguns.com/api/ip', {method: 'GET', headers: {'pragma': 'no-cache', 'cache-control': 'no-cache'},
      cache: 'no-store'});
      const data = await res.json();
      ip = data.ip;
    }catch(e){
      this.error('Failed to fetch public IP.', e);
    }
    let oldVal: string = '';
    if (ip !== this._values.currentIP) {
      oldVal = this._values.currentIP;
      this.updateClientState({currentIP: ip});
      const ipLookup = await lookup(ip);
      if (ipLookup) {
        this.updateClientState({
          ipIsEU: ipLookup.eu === '1',
          ipCountry: ipLookup.country,
        });
      } else {
        this.error('IP lookup failed.');
      }
    }
    const retVal: {current: string; country: string; isEU: boolean; old?: string} = {
      current: ip,
      country: this._values.ipCountry,
      isEU: this._values.ipIsEU,
      old: oldVal,
    };
    return retVal;
  }

  updateClientState(values: Partial<ClientState>) {
    const updates: Partial<ClientState> = {};
    (
      Object.entries(values) as {
        [K in keyof ClientState]: [keyof PickByValue<ClientState, ClientState[K]>, ClientState[K]];
      }[keyof ClientState][]
    ).forEach(([key, value]) => {
      if (
        key in this._values &&
        typeof this._values[key] === typeof value &&
        this._values[key] !== value
      ) {
        // @ts-expect-error This works
        updates[key] = value;
        // @ts-expect-error This works
        this._values[key] = value;
      }
    });
    if (Object.keys(updates).length > 0) {
      this.emit('clientStateUpdates', updates);
    }
  }
}

export const clientState = new ClientStateSingle();
