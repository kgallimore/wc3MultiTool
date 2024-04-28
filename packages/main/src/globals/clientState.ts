import {Global} from '../globalBase';

import type {PickByValue} from './../utility';
import {lookup} from 'fast-geoip';
import {request} from 'http';

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
    this.getPublicIP();
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
  }> {
    let ip: string = '';
    const req = request(
      {
        host: 'api.ipify.org',
        port: 80,
        path: '/?format=json',
      },
      res => {
        res.setEncoding('utf8');

        let body = '';
        res.on('data', chunk => {
          body += chunk;
        });
        res.on('end', () => {
          const data = JSON.parse(body);
          ip = data.ip;
        });
      },
    );
    req.end();
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
