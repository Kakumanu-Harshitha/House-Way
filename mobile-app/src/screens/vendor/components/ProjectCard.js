import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import theme from '../theme';

export default function ProjectCard({ project, onPress }) {
  // Extract relevant data from the project object
  const title = project.title || 'Untitled Project';
  const progress = project.progress || 0;
  const status = project.status || 'planning';
  
  // Determine status tag text
  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'on-hold': return 'On Hold';
      case 'planning': return 'Planning';
      default: return 'On Track';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <ImageBackground 
        source={project.image ? {uri: project.image} : null} 
        style={styles.bg} 
        imageStyle={{ borderRadius: theme.radius }}
      >
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.percent}>{progress}%</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{getStatusText(status)}</Text>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { 
    width: '48%', 
    borderRadius: theme.radius, 
    marginBottom: 12, 
    overflow: 'hidden', 
    backgroundColor: '#eee' 
  },
  bg: { 
    height: 180, 
    justifyContent: 'flex-end' 
  },
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.25)' 
  },
  content: { 
    padding: 14, 
    zIndex: 2 
  },
  title: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 8 
  },
  progressBar: { 
    flex: 1, 
    height: 8, 
    backgroundColor: '#e6e6e6', 
    borderRadius: 6, 
    marginRight: 8 
  },
  progressFill: { 
    height: 8, 
    backgroundColor: theme.colors.primary2, 
    borderRadius: 6 
  },
  percent: { 
    color: '#fff', 
    fontWeight: '700' 
  },
  tag: { 
    marginTop: 8, 
    alignSelf: 'flex-start', 
    backgroundColor: '#fff', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  tagText: { 
    color: theme.colors.text, 
    fontWeight: '600' 
  }
});