import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Title, Text, DataTable, Chip, IconButton, Searchbar } from 'react-native-paper';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function MasterTrackerScreen() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  
  const { user } = useAuth();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterAndSortProjects();
  }, [projects, searchQuery, sortConfig]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAndSortProjects = () => {
    let filtered = [...projects];
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(project => 
        project.projectName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort projects
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'estimatedCompletionDate' || sortConfig.key === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredProjects(filtered);
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStageInfo = (project, stage) => {
    const stageData = project.stages[stage.toLowerCase()];
    if (!stageData) return { status: 'pending', date: null };
    
    let date = null;
    if (stageData.completedAt) {
      date = new Date(stageData.completedAt);
    } else if (stageData.submittedAt) {
      date = new Date(stageData.submittedAt);
    } else if (stageData.startedAt) {
      date = new Date(stageData.startedAt);
    }
    
    return { status: stageData.status, date };
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#757575',
      'submitted': '#2196F3',
      'partial_completed': '#FF9800',
      'in_progress': '#FF9800',
      'completed': '#4CAF50'
    };
    return colors[status] || '#757575';
  };

  const renderStageCell = (project, stage) => {
    const { status, date } = getStageInfo(project, stage);
    
    return (
      <View style={styles.stageCell}>
        <Chip
          style={[styles.statusChip, { backgroundColor: getStatusColor(status) }]}
          textStyle={styles.statusChipText}
        >
          {status.replace('_', ' ')}
        </Chip>
        {date && (
          <Text style={styles.dateText}>
            {date.toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search projects..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchProjects();
          }} />
        }
      >
        <DataTable style={styles.dataTable}>
          <DataTable.Header>
            <DataTable.Title 
              style={styles.projectNameColumn}
              onPress={() => handleSort('projectName')}
              sortDirection={sortConfig.key === 'projectName' ? sortConfig.direction : null}
            >
              Project Name
            </DataTable.Title>
            
            <DataTable.Title 
              style={styles.dateColumn}
              onPress={() => handleSort('estimatedCompletionDate')}
              sortDirection={sortConfig.key === 'estimatedCompletionDate' ? sortConfig.direction : null}
            >
              Due Date
            </DataTable.Title>
            
            {user?.role === 'admin' && (
              <DataTable.Title style={styles.amountColumn} numeric>
                Amount
              </DataTable.Title>
            )}
            
            <DataTable.Title style={styles.stageColumn}>Sales</DataTable.Title>
            <DataTable.Title style={styles.stageColumn}>DNE</DataTable.Title>
            <DataTable.Title style={styles.stageColumn}>Production</DataTable.Title>
            <DataTable.Title style={styles.stageColumn}>Installation</DataTable.Title>
            
            <DataTable.Title 
              style={styles.statusColumn}
              onPress={() => handleSort('currentStage')}
              sortDirection={sortConfig.key === 'currentStage' ? sortConfig.direction : null}
            >
              Current Stage
            </DataTable.Title>
          </DataTable.Header>
          
          {filteredProjects.map((project) => (
            <DataTable.Row key={project._id}>
              <DataTable.Cell style={styles.projectNameColumn}>
                <Text numberOfLines={2}>{project.projectName}</Text>
              </DataTable.Cell>
              
              <DataTable.Cell style={styles.dateColumn}>
                {new Date(project.estimatedCompletionDate).toLocaleDateString()}
              </DataTable.Cell>
              
              {user?.role === 'admin' && (
                <DataTable.Cell style={styles.amountColumn} numeric>
                  ${project.amount}
                </DataTable.Cell>
              )}
              
              <DataTable.Cell style={styles.stageColumn}>
                {renderStageCell(project, 'Sales')}
              </DataTable.Cell>
              
              <DataTable.Cell style={styles.stageColumn}>
                {renderStageCell(project, 'DNE')}
              </DataTable.Cell>
              
              <DataTable.Cell style={styles.stageColumn}>
                {renderStageCell(project, 'Production')}
              </DataTable.Cell>
              
              <DataTable.Cell style={styles.stageColumn}>
                {renderStageCell(project, 'Installation')}
              </DataTable.Cell>
              
              <DataTable.Cell style={styles.statusColumn}>
                <Chip
                  style={[styles.currentStageChip, { 
                    backgroundColor: project.currentStage === 'Completed' ? '#4CAF50' : '#2196F3' 
                  }]}
                  textStyle={styles.currentStageChipText}
                >
                  {project.currentStage}
                </Chip>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </ScrollView>
      
      {filteredProjects.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No projects found matching your search' : 'No projects available'}
          </Text>
        </View>
      )}
      
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title>Summary</Title>
          <View style={styles.summaryRow}>
            <Text>Total Projects: {projects.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Completed: {projects.filter(p => p.currentStage === 'Completed').length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>In Progress: {projects.filter(p => p.currentStage !== 'Completed').length}</Text>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 10,
  },
  dataTable: {
    backgroundColor: '#fff',
    minWidth: 1000,
  },
  projectNameColumn: {
    width: 200,
  },
  dateColumn: {
    width: 100,
  },
  amountColumn: {
    width: 100,
  },
  stageColumn: {
    width: 120,
  },
  statusColumn: {
    width: 120,
  },
  stageCell: {
    alignItems: 'center',
  },
  statusChip: {
    height: 24,
    marginBottom: 2,
  },
  statusChipText: {
    fontSize: 10,
    color: '#fff',
  },
  dateText: {
    fontSize: 10,
    color: '#666',
  },
  currentStageChip: {
    height: 26,
  },
  currentStageChipText: {
    fontSize: 11,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  summaryCard: {
    margin: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
}); 