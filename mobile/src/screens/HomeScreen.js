import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, IconButton } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  {
    id: 'Sales',
    title: 'Sales',
    icon: 'currency-usd',
    color: '#4CAF50',
    description: 'Submit new projects'
  },
  {
    id: 'DNE',
    title: 'DNE',
    icon: 'pencil-ruler',
    color: '#2196F3',
    description: 'Design & Engineering'
  },
  {
    id: 'Production',
    title: 'Production',
    icon: 'factory',
    color: '#FF9800',
    description: 'Manage production'
  },
  {
    id: 'Installation',
    title: 'Installation',
    icon: 'hammer-screwdriver',
    color: '#9C27B0',
    description: 'Track installation'
  },
  {
    id: 'MasterTracker',
    title: 'Master Tracker',
    icon: 'chart-timeline-variant',
    color: '#F44336',
    description: 'Overall progress'
  },
  {
    id: 'Complaint',
    title: 'Complain',
    icon: 'alert-circle',
    color: '#607D8B',
    description: 'Submit complaints'
  }
];

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleMenuPress = (menuId) => {
    navigation.navigate(menuId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.department}>{user?.department} Department</Text>
        </View>
        <IconButton
          icon="logout"
          size={24}
          onPress={logout}
          style={styles.logoutButton}
        />
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.cardContainer}
              onPress={() => handleMenuPress(item.id)}
              activeOpacity={0.8}
            >
              <Card style={[styles.card, { backgroundColor: item.color }]}>
                <View style={styles.cardContent}>
                  <IconButton
                    icon={item.icon}
                    size={48}
                    iconColor="#fff"
                    style={styles.icon}
                  />
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    elevation: 2,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  department: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    margin: 0,
  },
  scrollContent: {
    padding: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    marginBottom: 15,
  },
  card: {
    elevation: 4,
    borderRadius: 15,
  },
  cardContent: {
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    margin: 0,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  cardDescription: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
    textAlign: 'center',
  },
}); 