const BaseAccessory = require('./BaseAccessory');

class SimplePetFeederAccessory extends BaseAccessory {
    static getCategory(Categories) {
        return Categories.OTHER;
    }
    
    constructor(...props) {
        super(...props);
    }
    
    _registerPlatformAccessory() {
        const {Service} = this.hap;
        
        this.log("Pet Feeder!");
        
        this.accessory.addService(Service.Switch, this.device.context.name);
        this.accessory.addService(Service.ContactSensor, this.device.context.name);
        this._isExpressFeeding = false;
        
        super._registerPlatformAccessory();
    }
    
    _registerCharacteristics(dps) {
        const {Service, Characteristic} = this.hap;
        const service = this.accessory.getService(Service.Switch);
        this._checkServiceName(service, this.device.context.name);
        
        
        this.dpExpressFeed = this._getCustomDP(this.device.context.dpExpressFeed) || '3';
        this.dpExpressFeedPortions = parseInt(this._getCustomDP(this.device.context.dpExpressFeedPortions)) || 1;
        
        this.dpEmptySensor = this._getCustomDP(this.device.context.dpEmptySensor) || '14';
        this.dpIsEmptyValue = this._getCustomDP(this.device.context.dpIsEmptyValue) || '2';
        
        let contactService = this.accessory.getService(Service.ContactSensor);
        if(contactService) {
                this.characteristicContactState = contactService.getCharacteristic(Characteristic.ContactSensorState);
                this.characteristicContactState.updateValue(dps[this.dpEmptySensor] == this.dpIsEmptyValue);
                this._checkServiceName(contactService, this.device.context.name + " Is Empty");
            }
        
        this._isExpressFeeding = false;
       this.characteristicOn = service.getCharacteristic(Characteristic.On)
            .updateValue(false)
            .on('get', this.getExpressFeed.bind(this))
            .on('set', this.setExpressFeed.bind(this));
        
        this.device.on('change', (changes, state) => {
            if (this.characteristicOn.value !== this._isExpressFeeding) {
                this.characteristicOn.updateValue(this._isExpressFeeding);
            }
            
            //this.log(changes);
            //this.log(state);
            
            if (this.characteristicContactState && changes.hasOwnProperty(this.dpEmptySensor)) {    
                let newValue = (changes[this.dpEmptySensor] == this.dpIsEmptyValue) ? 1 : 0;
               // this.log(changes[this.dpEmptySensor] == this.dpIsEmptyValue);
               // this.log(newValue);
                if (this.characteristicContactState.value !== newValue) {
                        this.log("Pet Feeder Empty State Changed");
                        this.characteristicContactState.updateValue(newValue);
                }
            }
        });
    }
    
    getExpressFeed(callback) {
        callback(null, this._isExpressFeeding);
    }
    
    _getExpressFeed(dp) {
        const {Characteristic} = this.hap;
        return dp;
    }
    
    setExpressFeed(value, callback) {
        const {Characteristic} = this.hap;
        
        if (value == true && this._isExpressFeeding == false) {
            this._isExpressFeeding = true;
            
            var self = this;
            setTimeout(function () {
                self._isExpressFeeding = false;
                self.characteristicOn.updateValue(false);
            }, Math.max(5000, this.dpExpressFeedPortions * 2500));
            
            return this.setState(this.dpExpressFeed, this.dpExpressFeedPortions, callback);
        
        // do a callback
        } else {
            callback();
        }

    }
}

module.exports = SimplePetFeederAccessory;
