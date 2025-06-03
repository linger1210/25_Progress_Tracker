import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Text, Checkbox, Button, Snackbar, SegmentedButtons, List, IconButton } from 'react-native-paper';
import api from '../services/api';

export default function DNEScreen() {
  const [tab, setTab] = useState('wip');
  const [wipProjects, setWipProjects] = useState([]);
  const [historyProjects, setHistoryProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [tab]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects?stage=DNE');
      const projects = response.data;
      
      // Filter projects for WIP and History
      const wip = projects.filter(p => 
        p.stages.dne.status === 'pending' || 
        p.stages.dne.status === 'partial_completed'
      );
      const history = projects.filter(p => 
        p.stages.dne.status === 'completed'
      );
      
      setWipProjects(wip);
      setHistoryProjects(history);
    } catch (error) {
      setError('Failed to fetch projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (projectId, status) => {
    try {
      setLoading(true);
      await api.post(`/projects/${projectId}/dne-update`, { status });
      
      setSuccess(`Project marked as ${status.replace('_', ' ')}`);
      fetchProjects();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (projectId) => {
    try {
      setLoading(true);
      await api.post(`/projects/${projectId}/dne-update`, { status: 'pending' });
      
      setSuccess('Project reverted to WIP');
      fetchProjects();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to revert project');
    } finally {
      setLoading(false);
    }
  };

  const renderProject = (project, isHistory = false) => (
    <Card key={project._id} style={styles.projectCard}>
      <Card.Content>
        <View style={styles.projectHeader}>
          <View style={styles.projectInfo}>
            <Title>{project.projectName}</Title>
            <Text>Due: {new Date(project.estimatedCompletionDate).toLocaleDateString()}</Text>
            {project.stages.dne.status === 'partial_completed' && (
              <Text style={styles.partialStatus}>Partial Completed</Text>
            )}
          </View>
        </View>
        
        {!isHistory ? (
          <View style={styles.checkboxContainer}>
            <View style={styles.checkboxRow}>
              <Checkbox
                status={project.stages.dne.status === 'partial_completed' ? 'checked' : 'unchecked'}
                onPress={() => handleStatusUpdate(project._id, 'partial_completed')}
                disabled={loading || project.stages.dne.status === 'completed'}
              />
              <Text>Partial Completed</Text>
            </View>
            
            <View style={styles.checkboxRow}>
              <Checkbox
                status={project.stages.dne.status === 'completed' ? 'checked' : 'unchecked'}
                onPress={() => handleStatusUpdate(project._id, 'completed')}
                disabled={loading}
              />
              <Text>Completed</Text>
            </View>
          </View>
        ) : (
          <View style={styles.historyActions}>
            <Text style={styles.completedText}>
              Completed on: {new Date(project.stages.dne.completedAt).toLocaleDateString()}
            </Text>
            <Button
              mode="outlined"
              onPress={() => handleRevert(project._id)}
              disabled={loading}
              compact
            >
              Revert to WIP
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

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
                <Text style={styles.emptyText}>No projects in WIP</Text>
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
  partialStatus: {
    color: '#FF9800',
    fontWeight: 'bold',
    marginTop: 5,
  },
  checkboxContainer: {
    marginTop: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  historyActions: {
    marginTop: 10,
  },
  completedText: {
    color: '#4CAF50',
    marginBottom: 10,
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
}); 