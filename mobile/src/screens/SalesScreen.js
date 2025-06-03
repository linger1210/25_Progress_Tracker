import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { TextInput, Button, Card, Title, Text, FAB, Dialog, Portal, List, IconButton, Snackbar, SegmentedButtons } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SalesScreen() {
  const [tab, setTab] = useState('submit');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [projectName, setProjectName] = useState('');
  const [amount, setAmount] = useState('');
  const [completionDate, setCompletionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  const { user } = useAuth();

  useEffect(() => {
    if (tab === 'history') {
      fetchProjects();
    }
  }, [tab]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async () => {
    if (!projectName || !amount || !completionDate) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/projects', {
        projectName,
        amount: parseFloat(amount),
        estimatedCompletionDate: completionDate.toISOString()
      });
      
      setSuccess('Project submitted successfully');
      setProjectName('');
      setAmount('');
      setCompletionDate(new Date());
      
      // Switch to history tab
      setTab('history');
      fetchProjects();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to submit project');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setProjectName(project.projectName);
    setAmount(project.amount?.toString() || '');
    setCompletionDate(new Date(project.estimatedCompletionDate));
    setEditDialog(true);
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await api.put(`/projects/${editingProject._id}`, {
        projectName,
        amount: parseFloat(amount),
        estimatedCompletionDate: completionDate.toISOString()
      });
      
      setSuccess('Project updated successfully');
      setEditDialog(false);
      fetchProjects();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    try {
      await api.delete(`/projects/${projectId}`);
      setSuccess('Project deleted successfully');
      fetchProjects();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete project');
    }
  };

  const getStatusColor = (stage) => {
    const colors = {
      'Sales': '#4CAF50',
      'DNE': '#2196F3',
      'Production': '#FF9800',
      'Installation': '#9C27B0',
      'Completed': '#607D8B'
    };
    return colors[stage] || '#757575';
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'submit', label: 'Submit Project' },
          { value: 'history', label: 'History' }
        ]}
        style={styles.tabs}
      />

      {tab === 'submit' ? (
        <ScrollView style={styles.content}>
          <Card style={styles.formCard}>
            <Card.Content>
              <Title>New Project</Title>
              
              <TextInput
                label="Project Name"
                value={projectName}
                onChangeText={setProjectName}
                style={styles.input}
                disabled={loading}
              />
              
              <TextInput
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={styles.input}
                disabled={loading}
              />
              
              <Button
                mode="outlined"
                onPress={() => setShowDatePicker(true)}
                style={styles.input}
                disabled={loading}
              >
                Completion Date: {completionDate.toLocaleDateString()}
              </Button>
              
              {showDatePicker && (
                <DateTimePicker
                  value={completionDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setCompletionDate(selectedDate);
                    }
                  }}
                />
              )}
              
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.submitButton}
                loading={loading}
                disabled={loading}
              >
                Submit Project
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchProjects();
            }} />
          }
        >
          {projects.map((project) => (
            <Card key={project._id} style={styles.projectCard}>
              <Card.Content>
                <View style={styles.projectHeader}>
                  <View style={styles.projectInfo}>
                    <Title>{project.projectName}</Title>
                    <Text>Due: {new Date(project.estimatedCompletionDate).toLocaleDateString()}</Text>
                    {user?.role === 'admin' && (
                      <Text style={styles.amount}>Amount: ${project.amount}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.currentStage) }]}>
                    <Text style={styles.statusText}>{project.currentStage}</Text>
                  </View>
                </View>
                
                <View style={styles.actions}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => handleEdit(project)}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDelete(project._id)}
                  />
                </View>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={editDialog} onDismiss={() => setEditDialog(false)}>
          <Dialog.Title>Edit Project</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Project Name"
              value={projectName}
              onChangeText={setProjectName}
              style={styles.input}
            />
            
            {user?.role === 'admin' && (
              <TextInput
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={styles.input}
              />
            )}
            
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              style={styles.input}
            >
              Completion Date: {completionDate.toLocaleDateString()}
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialog(false)}>Cancel</Button>
            <Button onPress={handleUpdate} loading={loading}>Update</Button>
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
  formCard: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  submitButton: {
    marginTop: 10,
  },
  projectCard: {
    marginBottom: 10,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  projectInfo: {
    flex: 1,
  },
  amount: {
    marginTop: 5,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
}); 