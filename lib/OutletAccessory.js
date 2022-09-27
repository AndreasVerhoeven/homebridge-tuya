const BaseAccessory = require('./BaseAccessory');

class OutletAccessory extends BaseAccessory {
    static getCategory(Categories) {
        return Categories.OUTLET;
    }

    constructor(...props) {
        super(...props);
    }

    _registerPlatformAccessory() {
        const {Service} = this.hap;

        this.accessory.addService(Service.Outlet, this.device.context.name);
        
        let createContactSensorForInUse = this.device.context.createContactSensorForInUse || true;
        if (createContactSensorForInUse) {
            this.log("Created ContactSensor");
            this.accessory.addService(Service.ContactSensor, this.device.context.name);
        }

        super._registerPlatformAccessory();
    }

    _registerCharacteristics(dps) {
        const {Service, Characteristic, EnergyCharacteristics} = this.hap;
        const service = this.accessory.getService(Service.Outlet);
        this._checkServiceName(service, this.device.context.name);

        this.dpPower = this._getCustomDP(this.device.context.dpPower) || '1';
        this.outletInUse = false;

        const energyKeys = {
            volts: this._getCustomDP(this.device.context.voltsId),
            voltsDivisor: parseInt(this.device.context.voltsDivisor) || 10,
            amps: this._getCustomDP(this.device.context.ampsId),
            ampsDivisor: parseInt(this.device.context.ampsDivisor) || 1000,
            watts: this._getCustomDP(this.device.context.wattsId),
            wattsDivisor: parseInt(this.device.context.wattsDivisor) || 10
        };
        
        let reportOutletInUseBasedOnWatts = this.device.context.reportOutletInUseBasedOnWatts || true;
        let inUseWattsTreshold = parseInt(this.device.context.inUseWattsTreshold) || 1;
        let createContactSensorForInUse = this.device.context.createContactSensorForInUse || true;

        let characteristicVolts;
        if (energyKeys.volts) {
            characteristicVolts = service.getCharacteristic(EnergyCharacteristics.Volts)
                .updateValue(this._getDividedState(dps[energyKeys.volts], energyKeys.voltsDivisor))
                .on('get', this.getDividedState.bind(this, energyKeys.volts, energyKeys.voltsDivisor));
        } else this._removeCharacteristic(service, EnergyCharacteristics.Volts);

        let characteristicAmps;
        if (energyKeys.amps) {
            characteristicAmps = service.getCharacteristic(EnergyCharacteristics.Amperes)
                .updateValue(this._getDividedState(dps[energyKeys.amps], energyKeys.ampsDivisor))
                .on('get', this.getDividedState.bind(this, energyKeys.amps, energyKeys.ampsDivisor));
        } else this._removeCharacteristic(service, EnergyCharacteristics.Amperes);

        let characteristicWatts;
        if (energyKeys.watts) {
            characteristicWatts = service.getCharacteristic(EnergyCharacteristics.Watts)
                .updateValue(this._getDividedState(dps[energyKeys.watts], energyKeys.wattsDivisor))
                .on('get', this.getDividedState.bind(this, energyKeys.watts, energyKeys.wattsDivisor));
        } else this._removeCharacteristic(service, EnergyCharacteristics.Watts);
        
        const characteristicOn = service.getCharacteristic(Characteristic.On)
            .updateValue(dps[this.dpPower])
            .on('get', this.getState.bind(this, this.dpPower))
            .on('set', this.setState.bind(this, this.dpPower));
            
        let characteristicOutletInUse;
        let characteristicContactState;
        if (energyKeys.watts) {
            if(reportOutletInUseBasedOnWatts) {
                characteristicOutletInUse = service.getCharacteristic(Characteristic.OutletInUse);
                this.log("Outlet In Use characteristic");
            }   
            
            if(createContactSensorForInUse) {
                let contactService = this.accessory.getService(Service.ContactSensor);
                if(contactService) {
                    characteristicContactState = contactService.getCharacteristic(Characteristic.ContactSensorState);
                    this._checkServiceName(contactService, this.device.context.name + " Using Electricity");
                }
            }
        }
        
        this.device.on('change', changes => {
            if (changes.hasOwnProperty(this.dpPower) && characteristicOn.value !== changes[this.dpPower]) characteristicOn.updateValue(changes[this.dpPower]);
            
            if (changes.hasOwnProperty(energyKeys.volts) && characteristicVolts) {
                const newVolts = this._getDividedState(changes[energyKeys.volts], energyKeys.voltsDivisor);
                if (characteristicVolts.value !== newVolts) characteristicVolts.updateValue(newVolts);
            }

            if (changes.hasOwnProperty(energyKeys.amps) && characteristicAmps) {
                const newAmps = this._getDividedState(changes[energyKeys.amps], energyKeys.ampsDivisor);
                if (characteristicAmps.value !== newAmps) characteristicAmps.updateValue(newAmps);
            }

            if (changes.hasOwnProperty(energyKeys.watts) && characteristicWatts) {
                const newWatts = this._getDividedState(changes[energyKeys.watts], energyKeys.wattsDivisor);
                if (characteristicWatts.value !== newWatts) characteristicWatts.updateValue(newWatts);
                
                
                const isInUse = (changes[energyKeys.watts] > inUseWattsTreshold);
                if (characteristicOutletInUse) {
                    if(characteristicOutletInUse.value !== isInUse) {
                        this.log("Changed Outlet In Use characteristic");
                        characteristicOutletInUse.updateValue(isInUse);
                    }
                }
                
                if (characteristicContactState) {
                    let newValue = isInUse ?  1 : 0;
                    if (characteristicContactState.value !== newValue) {
                        this.log("Changed ContactSensor value");
                        characteristicContactState.updateValue(newValue);
                    }
                }
            }
        });
    }
}

module.exports = OutletAccessory;