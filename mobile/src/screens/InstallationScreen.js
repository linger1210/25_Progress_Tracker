import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { Card, Title, Text, Button, IconButton, Checkbox, Dialog, Portal, Snackbar, SegmentedButtons, List, Chip, FAB } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

export default function InstallationScreen() {
  const [tab, setTab] = useState('wip');
  const [wipProjects, setWipProjects] = useState([]);
  const [historyProjects, setHistoryProjects] = useState([]);
  const [milestones, setMilestones] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Photo upload
  const [photoDialog, setPhotoDialog] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, [tab]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects?stage=Installation');
      const projects = response.data;
      
      // Filter projects for WIP and History
      const wip = projects.filter(p => p.stages.installation.status === 'in_progress');
      const history = projects.filter(p => p.stages.installation.status === 'completed');
      
      setWipProjects(wip);
      setHistoryProjects(history);
      
      // Fetch milestones for each WIP project
      for (const project of wip) {
        await fetchMilestones(project._id);
      }
    } catch (error) {
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMilestones = async (projectId) => {
    try {
      const response = await api.get(`/milestones/project/${projectId}`);
      setMilestones(prev => ({ ...prev, [projectId]: response.data }));
    } catch (error) {
      console.error('Failed to fetch milestones for project:', projectId);
    }
  };

  const handleMilestoneStatusUpdate = async (milestoneId, status) => {
    try {
      await api.put(`/milestones/${milestoneId}`, { status });
      setSuccess(`Milestone marked as ${status}`);
      
      // Refresh to check if all milestones are completed
      fetchProjects();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update milestone');
    }
  };

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      setError('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadPhoto(result.assets[0]);
    }
  };

  const handleCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      setError('Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async (photo) => {
    try {
      setLoading(true);
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `milestone-${Date.now()}.jpg`,
      });

      // Upload file
      const uploadResponse = await api.post('/uploads/single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Add photo URL to milestone
      await api.post(`/milestones/${selectedMilestone._id}/photos`, {
        url: uploadResponse.data.url
      });

      setSuccess('Photo uploaded successfully');
      setPhotoDialog(false);
      fetchMilestones(selectedProject._id);
    } catch (error) {
      setError('Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const renderMilestone = (milestone, project) => (
    <Card key={milestone._id} style={styles.milestoneCard}>
      <Card.Content>
        <View style={styles.milestoneHeader}>
          <View style={styles.milestoneInfo}>
            <Text style={styles.milestoneName}>{milestone.name}</Text>
            <View style={styles.statusRow}>
              <Checkbox
                status={milestone.status === 'completed' ? 'checked' : 'unchecked'}
                onPress={() => handleMilestoneStatusUpdate(milestone._id, 
                  milestone.status === 'completed' ? 'in_progress' : 'completed'
                )}
              />
              <Text>{milestone.status === 'completed' ? 'Completed' : 'In Progress'}</Text>
            </View>
          </View>
          
          {milestone.status === 'in_progress' && (
            <IconButton
              icon="camera"
              size={24}
              onPress={() => {
                setSelectedMilestone(milestone);
                setSelectedProject(project);
                setPhotoDialog(true);
              }}
            />
          )}
        </View>
        
        {milestone.photos && milestone.photos.length > 0 && (
          <View style={styles.photosContainer}>
            <Text style={styles.photosTitle}>Photos ({milestone.photos.length}):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {milestone.photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: `http://localhost:5000${photo.url}` }}
                  style={styles.photoThumbnail}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  const renderProject = (project, isHistory = false) => {
    const projectMilestones = milestones[project._id] || [];
    
    return (
      <Card key={project._id} style={styles.projectCard}>
        <Card.Content>
          <View style={styles.projectHeader}>
            <View style={styles.projectInfo}>
              <Title>{project.projectName}</Title>
              <Text>Due: {new Date(project.estimatedCompletionDate).toLocaleDateString()}</Text>
            </View>
          </View>
          
          {!isHistory ? (
            <View style={styles.milestonesContainer}>
              {projectMilestones.map(milestone => renderMilestone(milestone, project))}
            </View>
          ) : (
            <View style={styles.historyInfo}>
              <Text style={styles.completedText}>
                Completed on: {new Date(project.stages.installation.completedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.milestonesCount}>
                Total milestones: {projectMilestones.length}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'wip', label: 'WIP' },
          { value: 'history', label: 'History' }
        ]}
        style={styles.tabs}
      />

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchProjects();
          }} />
        }
      >
        {tab === 'wip' ? (
          wipProjects.length > 0 ? (
            wipProjects.map(project => renderProject(project))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No projects in installation</Text>
              </Card.Content>
            </Card>
          )
        ) : (
          historyProjects.length > 0 ? (
            historyProjects.map(project => renderProject(project, true))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No completed installations</Text>
              </Card.Content>
            </Card>
          )
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={photoDialog} onDismiss={() => setPhotoDialog(false)}>
          <Dialog.Title>Upload Photo</Dialog.Title>
          <Dialog.Content>
            <Text>Choose photo source for milestone: {selectedMilestone?.name}</Text>
            
            <View style={styles.photoOptions}>
              <Button
                mode="contained"
                icon="camera"
                onPress={handleCamera}
                style={styles.photoButton}
                disabled={loading}
              >
                Take Photo
              </Button>
              
              <Button
                mode="contained"
                icon="image"
                onPress={handleImagePicker}
                style={styles.photoButton}
                disabled={loading}
              >
                Choose from Gallery
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPhotoDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
      >
        {error}
      </Snackbar>
      
      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={3000}
      >
        {success}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabs: {
    margin: 10,
  },
  content: {
    flex: 1,
    padding: 10,
  },
  projectCard: {
    marginBottom: 10,
  },
  projectHeader: {
    marginBottom: 15,
  },
  projectInfo: {
    flex: 1,
  },
  milestonesContainer: {
    marginTop: 10,
  },
  milestoneCard: {
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photosContainer: {
    marginTop: 10,
  },
  photosTitle: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    marginRight: 5,
    borderRadius: 5,
  },
  historyInfo: {
    marginTop: 10,
  },
  completedText: {
    color: '#4CAF50',
  },
  milestonesCount: {
    marginTop: 5,
    color: '#666',
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  photoOptions: {
    marginTop: 20,
  },
  photoButton: {
    marginVertical: 5,
  },
}); 