import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../styles/theme';

// Standardized Card Component with Creative Designs
export const StandardCard = ({ 
  children, 
  variant = 'default', 
  onPress, 
  style,
  disabled = false 
}) => {
  const cardStyle = getCardStyle(variant);
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component
      style={[cardStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </Component>
  );
};

// Stats Card - For dashboard statistics
export const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  onPress,
  variant = 'default' 
}) => {
  return (
    <StandardCard variant={variant} onPress={onPress}>
      <View style={styles.statsContainer}>
        <View style={styles.statsHeader}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
          {trend && (
            <View style={[
              styles.trendContainer,
              { backgroundColor: trend > 0 ? theme.colors.success[100] : theme.colors.error[100] }
            ]}>
              <Text style={[
                styles.trendText,
                { color: trend > 0 ? theme.colors.success[600] : theme.colors.error[600] }
              ]}>
                {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.statsValue}>{value}</Text>
        <Text style={styles.statsTitle}>{title}</Text>
        {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
      </View>
    </StandardCard>
  );
};

// Project Card - For project listings
export const ProjectCard = ({ 
  project, 
  onPress,
  showProgress = true 
}) => {
  const statusColor = theme.statusColors.project[project.status] || theme.colors.primary[500];
  
  return (
    <StandardCard variant="accent" onPress={onPress}>
      <View style={styles.projectContainer}>
        <View style={styles.projectHeader}>
          <View style={styles.projectIdBadge}>
            <Text style={styles.projectIdText}>
              ID: {project.projectId || project._id?.slice(-6).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {project.status.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        
        <Text style={styles.projectTitle} numberOfLines={2}>
          {project.title}
        </Text>
        
        <Text style={styles.projectDescription} numberOfLines={2}>
          {project.description}
        </Text>
        
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { 
                    width: `${project.progress?.percentage || 0}%`,
                    backgroundColor: statusColor
                  }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {project.progress?.percentage || 0}% Complete
            </Text>
          </View>
        )}
      </View>
    </StandardCard>
  );
};

// Action Card - For action items and buttons
export const ActionCard = ({ 
  title, 
  subtitle, 
  icon, 
  onPress, 
  badge,
  variant = 'secondary' 
}) => {
  return (
    <StandardCard variant={variant} onPress={onPress}>
      <View style={styles.actionContainer}>
        <View style={styles.actionHeader}>
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>{icon}</Text>
          </View>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </StandardCard>
  );
};

// Info Card - For displaying information
export const InfoCard = ({ 
  title, 
  content, 
  icon,
  variant = 'default' 
}) => {
  return (
    <StandardCard variant={variant}>
      <View style={styles.infoContainer}>
        {icon && (
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>{icon}</Text>
          </View>
        )}
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoText}>{content}</Text>
        </View>
      </View>
    </StandardCard>
  );
};

// Helper function to get card styles based on variant
const getCardStyle = (variant) => {
  switch (variant) {
    case 'elevated':
      return styles.elevatedCard;
    case 'accent':
      return styles.accentCard;
    case 'primary':
      return styles.primaryCard;
    case 'secondary':
      return styles.secondaryCard;
    default:
      return styles.defaultCard;
  }
};

const styles = StyleSheet.create({
  // Base card styles
  defaultCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    ...theme.shadows.sm,
  },
  elevatedCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  accentCard: {
    backgroundColor: theme.colors.secondary[50],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
    ...theme.shadows.sm,
  },
  primaryCard: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  secondaryCard: {
    backgroundColor: theme.colors.secondary[100],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[300],
  },
  
  // Stats card styles
  statsContainer: {
    alignItems: 'center',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  trendContainer: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  trendText: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  statsValue: {
    fontSize: theme.typography.fontSizes.xxxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statsTitle: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  statsSubtitle: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  
  // Project card styles
  projectContainer: {
    flex: 1,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  projectIdBadge: {
    backgroundColor: theme.colors.background.tertiary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  projectIdText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.text.white,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  projectTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  projectDescription: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeights.normal * theme.typography.fontSizes.sm,
    marginBottom: theme.spacing.md,
  },
  progressContainer: {
    marginTop: theme.spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.sm,
  },
  progressText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.text.secondary,
    textAlign: 'right',
  },
  
  // Action card styles
  actionContainer: {
    alignItems: 'center',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconText: {
    fontSize: 24,
  },
  badge: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.round,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: theme.typography.fontSizes.xs,
    color: theme.colors.text.white,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  actionTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  actionSubtitle: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  
  // Info card styles
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  infoIconText: {
    fontSize: 20,
    color: theme.colors.primary[500],
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.typography.fontSizes.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeights.normal * theme.typography.fontSizes.sm,
  },
});
