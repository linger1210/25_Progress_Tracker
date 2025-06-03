import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import SalesScreen from '../screens/SalesScreen';
import DNEScreen from '../screens/DNEScreen';
import ProductionScreen from '../screens/ProductionScreen';
import InstallationScreen from '../screens/InstallationScreen';
import MasterTrackerScreen from '../screens/MasterTrackerScreen';
import ComplaintScreen from '../screens/ComplaintScreen';
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {user ? (
        <>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Progress Tracker' }}
          />
          <Stack.Screen 
            name="Sales" 
            component={SalesScreen} 
            options={{ title: 'Sales' }}
          />
          <Stack.Screen 
            name="DNE" 
            component={DNEScreen} 
            options={{ title: 'Design & Engineering' }}
          />
          <Stack.Screen 
            name="Production" 
            component={ProductionScreen} 
            options={{ title: 'Production' }}
          />
          <Stack.Screen 
            name="Installation" 
            component={InstallationScreen} 
            options={{ title: 'Installation' }}
          />
          <Stack.Screen 
            name="MasterTracker" 
            component={MasterTrackerScreen} 
            options={{ title: 'Master Tracker' }}
          />
          <Stack.Screen 
            name="Complaint" 
            component={ComplaintScreen} 
            options={{ title: 'Complaints' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
} 