import { useState, useEffect } from 'react';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';

export const useDeviceFingerprint = () => {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{
    platform: string;
    osVersion: string;
    deviceName: string;
  } | null>(null);

  useEffect(() => {
    generateFingerprint();
  }, []);

  const generateFingerprint = async () => {
    try {
      let storedFingerprint = await SecureStore.getItemAsync('deviceFingerprint');
      
      if (!storedFingerprint) {
        const deviceData = {
          brand: Device.brand,
          manufacturer: Device.manufacturer,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
          deviceType: Device.deviceType,
          isDevice: Device.isDevice,
        };
        
        const dataString = JSON.stringify(deviceData);
        storedFingerprint = uuidv4() + '-' + hashCode(dataString);
        
        await SecureStore.setItemAsync('deviceFingerprint', storedFingerprint);
      }

      setFingerprint(storedFingerprint);
      setDeviceInfo({
        platform: Device.osName || 'unknown',
        osVersion: Device.osVersion || 'unknown',
        deviceName: Device.modelName || 'unknown',
      });
    } catch (error) {
      console.error('Failed to generate device fingerprint:', error);
      const fallbackId = uuidv4();
      setFingerprint(fallbackId);
    }
  };

  return { fingerprint, deviceInfo };
};

function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
