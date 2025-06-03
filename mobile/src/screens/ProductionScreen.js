import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Text, Button, IconButton, TextInput, Dialog, Portal, Snackbar, SegmentedButtons, List, Chip } from 'react-native-paper';
import api from '../services/api';

export default function ProductionScreen() {
  const [tab, setTab] = useState('wip');
  const [wipProjects, setWipProjects] = useState([]);
  const [historyProjects, setHistoryProjects] = useState([]);
  const [milestones, setMilestones] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Milestone management
  const [selectedProject, setSelectedProject] = useState(null);
  const [milestoneDialog, setMilestoneDialog] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const [editingMilestones, setEditingMilestones] = useState([]);

  useEffect(() => {
    fetchProjects();
  }, [tab]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects?stage=Production');
      const projects = response.data;
      
      // Filter projects for WIP and History
      const wip = projects.filter(p => p.stages.production.status === 'in_progress');
      const history = projects.filter(p => p.stages.production.status === 'completed');
      
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

  const handleCreateMilestone = async () => {
    if (!newMilestone.trim()) {
      setError('Please enter milestone name');
      return;
    }

    try {
      setLoading(true);
      await api.post('/milestones', {
        projectId: selectedProject._id,
        name: newMilestone
      });
      
      setSuccess('Milestone added successfully');
      setNewMilestone('');
      
      // Refresh milestones
      await fetchMilestones(selectedProject._id);
      
      // Update editing milestones
      const updatedMilestones = [...editingMilestones, newMilestone];
      setEditingMilestones(updatedMilestones);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add milestone');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId, projectId) => {
    try {
      await api.delete(`/milestones/${milestoneId}`);
      setSuccess('Milestone deleted successfully');
      await fetchMilestones(projectId);
      
      // Update editing milestones
      const projectMilestones = milestones[projectId] || [];
      const deleted = projectMilestones.find(m => m._id === milestoneId);
      setEditingMilestones(editingMilestones.filter(m => m !== deleted?.name));
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete milestone');
    }
  };

  const handleSubmitMilestones = async () => {
    try {
      setLoading(true);
      await api.post(`/projects/${selectedProject._id}/production-update`);
      
      setSuccess('Project submitted to Installation');
      setMilestoneDialog(false);
      fetchProjects();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to submit project');
    } finally {
      setLoading(false);
    }
  };

  const openMilestoneDialog = (project) => {
    setSelectedProject(project);
    const projectMilestones = milestones[project._id] || [];
    setEditingMilestones(projectMilestones.map(m => m.name));
    setMilestoneDialog(true);
  };

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
            <>
              <View style={styles.milestonesContainer}>
                <Text style={styles.milestonesTitle}>Milestones:</Text>
                <View style={styles.milestonesList}>
                  {projectMilestones.map((milestone) => (
                    <Chip
                      key={milestone._id}
                      style={styles.milestoneChip}
                      textStyle={styles.milestoneChipText}
                    >
                      {milestone.name}
                    </Chip>
                  ))}
                </View>
              </View>
              
              <Button
                mode="contained"
                onPress={() => openMilestoneDialog(project)}
                style={styles.manageButton}
              >
                Manage Milestones
              </Button>
            </>
          ) : (
            <View style={styles.historyInfo}>
              <Text style={styles.completedText}>
                Completed on: {new Date(project.stages.production.completedAt).toLocaleDateString()}
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
                <Text style={styles.emptyText}>No projects in production</Text>
              </Card.Content>
            </Card>
          )
        ) : (
          historyProjects.length > 0 ? (
            historyProjects.map(project => renderProject(project, true))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No completed projects</Text>
              </Card.Content>
            </Card>
          )
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={milestoneDialog} onDismiss={() => setMilestoneDialog(false)}>
          <Dialog.Title>Manage Milestones</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.projectName}>{selectedProject?.projectName}</Text>
            
            <List.Section>
              {editingMilestones.map((milestone, index) => {
                const milestoneObj = milestones[selectedProject?._id]?.find(m => m.name === milestone);
                return (
                  <List.Item
                    key={index}
                    title={milestone}
                    right={() => (
                      <IconButton
                        icon="minus-circle"
                        size={20}
                        onPress={() => {
                          if (milestoneObj) {
                            handleDeleteMilestone(milestoneObj._id, selectedProject._id);
                          } else {
                            setEditingMilestones(editingMilestones.filter((_, i) => i !== index));
                          }
                        }}
                      />
                    )}
                  />
                );
              })}
            </List.Section>
            
            <View style={styles.addMilestoneContainer}>
              <TextInput
                label="New Milestone"
                value={newMilestone}
                onChangeText={setNewMilestone}
                style={styles.milestoneInput}
              />
              <IconButton
                icon="plus-circle"
                size={30}
                onPress={handleCreateMilestone}
                disabled={loading}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setMilestoneDialog(false)}>Cancel</Button>
            <Button 
              onPress={handleSubmitMilestones} 
              loading={loading}
              disabled={editingMilestones.length === 0}
            >
              Submit to Installation
            </Button>
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
    marginVertical: 10,
  },
  milestonesTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  milestonesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  milestoneChip: {
    margin: 2,
  },
  milestoneChipText: {
    fontSize: 12,
  },
  manageButton: {
    marginTop: 10,
  },
  historyInfo: {
    marginTop: 10,
  },
  completedText: {
    color: '#4CAF50',
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  addMilestoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  milestoneInput: {
    flex: 1,
  },
}); 