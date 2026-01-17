/**
 * TextMessageNode Component
 * 
 * Standard text message bubble for chat
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import UserAvatar from '../UserAvatar';

const TextMessageNode = ({ message, isOwnMessage, senderName, sender }) => {
  return (
    <View style={[
      styles.containerWrapper,
      isOwnMessage ? styles.ownWrapper : styles.otherWrapper
    ]}>
      {!isOwnMessage && (
        <UserAvatar
          user={sender}
          size={32}
          style={styles.avatar}
          showInitials={true}
        />
      )}
      <View style={[
        styles.container,
        isOwnMessage ? styles.ownContainer : styles.otherContainer,
      ]}>
        {/* Sender Name (for received messages) */}
        {!isOwnMessage && senderName && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        
        {/* Message Content */}
      <Text style={[
        styles.content,
        isOwnMessage ? styles.ownContent : styles.otherContent,
      ]}>
        {message.content}
      </Text>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[
          styles.timestamp,
          isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp,
        ]}>
          {new Date(message.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {isOwnMessage && (
          <MaterialIcons 
            name={message.read ? 'done-all' : 'done'} 
            size={14} 
            color={message.read ? '#3B82F6' : 'rgba(255,255,255,0.6)'} 
          />
        )}
      </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    width: '100%',
    paddingHorizontal: 8,
  },
  ownWrapper: {
    justifyContent: 'flex-end',
  },
  otherWrapper: {
    justifyContent: 'flex-start',
  },
  avatar: {
    marginRight: 8,
    marginBottom: 4,
  },
  container: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownContainer: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  otherContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownContent: {
    color: '#FFFFFF',
  },
  otherContent: {
    color: '#1F2937',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
  },
  ownTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherTimestamp: {
    color: '#9CA3AF',
  },
});

export default TextMessageNode;
