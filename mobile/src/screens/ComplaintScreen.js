import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Text, Button, TextInput, Dialog, Portal, List, IconButton, Snackbar, SegmentedButtons, Chip, Menu, FAB } from 'react-native-paper';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ComplaintScreen() {
  const [tab, setTab] = useState('submit');
  const [complaints, setComplaints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [selectedProject, setSelectedProject] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [projectMenuVisible, setProjectMenuVisible] = useState(false);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  
  // Edit dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [status, setStatus] = useState('');
  const [resolution, setResolution] = useState('');
  
  const { user } = useAuth();

  useEffect(() => {
    if (tab === 'submit') {
      fetchProjects();
    } else {
      fetchComplaints();
    }
  }, [tab]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects');
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await api.get('/complaints');
      setComplaints(response.data);
    } catch (error) {
      setError('Failed to fetch complaints');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProject || !title || !description) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/complaints', {
        projectId: selectedProject._id,
        title,
        description,
        priority
      });
      
      setSuccess('Complaint submitted successfully');
      setSelectedProject(null);
      setTitle('');
      setDescription('');
      setPriority('medium');
      
      // Switch to status tab
      setTab('status');
      fetchComplaints();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await api.put(`/complaints/${editingComplaint._id}`, {
        status,
        priority: editingComplaint.priority,
        resolution
      });
      
      setSuccess('Complaint updated successfully');
      setEditDialog(false);
      fetchComplaints();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update complaint');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (complaintId) => {
    try {
      await api.delete(`/complaints/${complaintId}`);
      setSuccess('Complaint deleted successfully');
      fetchComplaints();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete complaint');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#FF9800',
      'in_progress': '#2196F3',
      'resolved': '#4CAF50',
      'closed': '#757575'
    };
    return colors[status] || '#757575';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': '#4CAF50',
      'medium': '#FF9800',
      'high': '#F44336'
    };
    return colors[priority] || '#757575';
  };

  const openEditDialog = (complaint) => {
    setEditingComplaint(complaint);
    setStatus(complaint.status);
    setResolution(complaint.resolution || '');
    setEditDialog(true);
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'submit', label: 'Submit Complaint' },
          { value: 'status', label: 'Complaint Status' }
        ]}
        style={styles.tabs}
      />

      {tab === 'submit' ? (
        <ScrollView style={styles.content}>
          <Card style={styles.formCard}>
            <Card.Content>
              <Title>New Complaint</Title>
              
              <Menu
                visible={projectMenuVisible}
                onDismiss={() => setProjectMenuVisible(false)}
                anchor={
                  <Button 
                    mode="outlined" 
                    onPress={() => setProjectMenuVisible(true)}
                    style={styles.input}
                    disabled={loading}
                  >
                    {selectedProject ? selectedProject.projectName : 'Select Project'}
                  </Button>
                }
              >
                <ScrollView style={{ maxHeight: 300 }}>
                  {projects.map((project) => (
                    <Menu.Item 
                      key={project._id}
                      onPress={() => {
                        setSelectedProject(project);
                        setProjectMenuVisible(false);
                      }} 
                      title={project.projectName} 
                    />
                  ))}
                </ScrollView>
              </Menu>
              
              <TextInput
                label="Title"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                disabled={loading}
              />
              
              <TextInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                style={styles.input}
                disabled={loading}
              />
              
              <Menu
                visible={priorityMenuVisible}
                onDismiss={() => setPriorityMenuVisible(false)}
                anchor={
                  <Button 
                    mode="outlined" 
                    onPress={() => setPriorityMenuVisible(true)}
                    style={styles.input}
                    disabled={loading}
                  >
                    Priority: {priority}
                  </Button>
                }
              >
                <Menu.Item onPress={() => { setPriority('low'); setPriorityMenuVisible(false); }} title="Low" />
                <Menu.Item onPress={() => { setPriority('medium'); setPriorityMenuVisible(false); }} title="Medium" />
                <Menu.Item onPress={() => { setPriority('high'); setPriorityMenuVisible(false); }} title="High" />
              </Menu>
              
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.submitButton}
                loading={loading}
                disabled={loading}
              >
                Submit Complaint
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
              fetchComplaints();
            }} />
          }
        >
          {complaints.map((complaint) => (
            <Card key={complaint._id} style={styles.complaintCard}>
              <Card.Content>
                <View style={styles.complaintHeader}>
                  <View style={styles.complaintInfo}>
                    <Title numberOfLines={1}>{complaint.title}</Title>
                    <Text style={styles.projectName}>
                      Project: {complaint.project?.projectName || 'Unknown'}
                    </Text>
                    <Text numberOfLines={2}>{complaint.description}</Text>
                    <View style={styles.metaRow}>
                      <Chip
                        style={[styles.statusChip, { backgroundColor: getStatusColor(complaint.status) }]}
                        textStyle={styles.chipText}
                      >
                        {complaint.status.replace('_', ' ')}
                      </Chip>
                      <Chip
                        style={[styles.priorityChip, { backgroundColor: getPriorityColor(complaint.priority) }]}
                        textStyle={styles.chipText}
                      >
                        {complaint.priority}
                      </Chip>
                    </View>
                    <Text style={styles.submittedBy}>
                      Submitted by: {complaint.submittedBy?.username || 'Unknown'}
                    </Text>
                    <Text style={styles.date}>
                      {new Date(complaint.createdAt).toLocaleDateString()}
                    </Text>
                    {complaint.resolution && (
                      <View style={styles.resolutionContainer}>
                        <Text style={styles.resolutionTitle}>Resolution:</Text>
                        <Text>{complaint.resolution}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.actions}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => openEditDialog(complaint)}
                    />
                    {(user?.role === 'admin' || complaint.submittedBy?._id === user?.id) && (
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => handleDelete(complaint._id)}
                      />
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
          
          {complaints.length === 0 && !loading && (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No complaints found</Text>
              </Card.Content>
            </Card>
          )}
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={editDialog} onDismiss={() => setEditDialog(false)}>
          <Dialog.Title>Update Complaint</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogTitle}>{editingComplaint?.title}</Text>
            
            <Menu
              visible={false}
              onDismiss={() => {}}
              anchor={
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    // Cycle through statuses
                    const statuses = ['pending', 'in_progress', 'resolved', 'closed'];
                    const currentIndex = statuses.indexOf(status);
                    const nextIndex = (currentIndex + 1) % statuses.length;
                    setStatus(statuses[nextIndex]);
                  }}
                  style={styles.input}
                >
                  Status: {status.replace('_', ' ')}
                </Button>
              }
            />
            
            <TextInput
              label="Resolution"
              value={resolution}
              onChangeText={setResolution}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
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
  complaintCard: {
    marginBottom: 10,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  complaintInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 5,
  },
  statusChip: {
    marginRight: 10,
  },
  priorityChip: {
    marginRight: 10,
  },
  chipText: {
    fontSize: 12,
    color: '#fff',
  },
  submittedBy: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  resolutionContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  resolutionTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  actions: {
    flexDirection: 'column',
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
}); 