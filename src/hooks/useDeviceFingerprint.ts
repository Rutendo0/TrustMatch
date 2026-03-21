import { useState, useEffect } from 'react';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

// Simple UUID generator without external dependency
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
          const char = dataString.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        storedFingerprint = generateUUID() + '-' + Math.abs(hash).toString(16);
        
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
      // Use a simple fallback
      const fallbackId = generateUUID();
      setFingerprint(fallbackId);
      setDeviceInfo({
        platform: 'unknown',
        osVersion: 'unknown',
        deviceName: 'unknown',
      });
    }
  };

  return { fingerprint, deviceInfo };
};
