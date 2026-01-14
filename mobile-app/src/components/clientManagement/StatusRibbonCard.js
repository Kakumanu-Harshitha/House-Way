import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const StatusRibbonCard = ({
  title,
  subtitle,
  avatar,
  onPress,
  status = 'active',
  contactInfo,
  tags = [],
  rightComponent,
}) => {
  const getStatusColor = () => {
    const colors = {
      active: ['#7DB87A', '#6BA869'],
      'at-risk': ['#E8B25D', '#D4A34D'],
      pending: ['#7487C1', '#6475B1'],
      inactive: ['#D75A5A', '#C74A4A'],
    };
    return colors[status] || colors.active;
  };

  const getStatusLabel = () => {
    return status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const ribbonColors = getStatusColor();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Status Ribbon */}
      <LinearGradient
        colors={ribbonColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.statusRibbon}
      >
        <Text style={styles.statusText}>{getStatusLabel()}</Text>
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Feather name="user" size={28} color="#7487C1" />
              </View>
            )}
            <View style={styles.avatarGlow} />
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}

          {/* Contact Information */}
          {contactInfo && (
            <View style={styles.contactInfo}>
              {contactInfo.email && (
                <View style={styles.contactItem}>
                  <Feather name="mail" size={14} color="#7487C1" />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {contactInfo.email}
                  </Text>
                </View>
              )}
              {contactInfo.phone && (
                <View style={styles.contactItem}>
                  <Feather name="phone" size={14} color="#7487C1" />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {contactInfo.phone}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText} numberOfLines={1}>
                    {tag}
                  </Text>
                </View>
              ))}
              {tags.length > 3 && (
                <View style={styles.moreTags}>
                  <Text style={styles.moreTagsText}>+{tags.length - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Right Component */}
        <View style={styles.rightSection}>
          {rightComponent || (
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View</Text>
              <Feather name="chevron-right" size={16} color="#3E60D8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Subtle border */}
      <View style={styles.border} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  statusRibbon: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    transform: [{ rotate: '-90deg' }],
    position: 'absolute',
    whiteSpace: 'nowrap',
  },
  content: {
    flexDirection: 'row',
    padding: 20,
    paddingLeft: 26, // Account for ribbon
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  defaultAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8EEF4',
  },
  avatarGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 34,
    backgroundColor: 'rgba(62, 96, 216, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(62, 96, 216, 0.2)',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B2540',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    color: '#7487C1',
    marginBottom: 8,
    fontWeight: '500',
  },
  contactInfo: {
    gap: 6,
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    color: '#7487C1',
    flex: 1,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: width * 0.2,
  },
  tagText: {
    fontSize: 11,
    color: '#7487C1',
    fontWeight: '600',
    textAlign: 'center',
  },
  moreTags: {
    backgroundColor: '#E8EEF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moreTagsText: {
    fontSize: 11,
    color: '#3E60D8',
    fontWeight: '700',
  },
  rightSection: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3E60D8',
  },
  border: {
    position: 'absolute',
    bottom: 0,
    left: 26, // Account for ribbon
    right: 20,
    height: 1,
    backgroundColor: '#F0F4F8',
  },
});

export default StatusRibbonCard;