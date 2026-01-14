import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

const LoginSelectionScreen = ({ navigation }) => {
  const { user } = useAuth();
  const cardScale1 = new Animated.Value(1);
  const cardScale2 = new Animated.Value(1);
  const cardScale3 = new Animated.Value(1);

  const handleCardPressIn = (cardScale) => {
    Animated.spring(cardScale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  };

  const handleCardPressOut = (cardScale) => {
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 40,
    }).start();
  };

  const handleProjectDashboardPress = () => {
    navigation.navigate('EmployeeDashboard');
  };

  const handleClientManagementPress = () => {
    navigation.navigate('HomeDashboard');
  };

  const handleExecutivePress = () => {
    navigation.navigate('ExecutiveDashboard');
  };

  return (
    <View style={styles.container}>
      {/* Background with gradient and floating blobs */}
      <LinearGradient
        colors={['#FFFFFF', '#FFF8E7', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Floating circular blobs */}
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
      <View style={[styles.blob, styles.blob3]} />
      <View style={[styles.blob, styles.blob4]} />

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subtitleText}>Choose your workspace</Text>
        </View>

        {/* Dashboard Selection Cards */}
        <View style={styles.cardsContainer}>
          {/* Project Dashboard Card */}
          <Animated.View style={[{ transform: [{ scale: cardScale1 }] }]}>
            <TouchableOpacity
              style={styles.dashboardCard}
              activeOpacity={0.9}
              onPressIn={() => handleCardPressIn(cardScale1)}
              onPressOut={() => handleCardPressOut(cardScale1)}
              onPress={handleProjectDashboardPress}>
              <View style={styles.cardIconContainer}>
                <Feather name="briefcase" size={40} color="#D4AF37" />
              </View>
              <Text style={styles.cardTitle}>Project Dashboard</Text>
              <Text style={styles.cardDescription}>
                Manage materials, requests, and project tasks
              </Text>
              <View style={styles.cardFeatures}>
                <View style={styles.featureItem}>
                  <Feather name="check-circle" size={16} color="#7DB87A" />
                  <Text style={styles.featureText}>Material Requests</Text>
                </View>
                <View style={styles.featureItem}>
                  <Feather name="check-circle" size={16} color="#7DB87A" />
                  <Text style={styles.featureText}>Task Management</Text>
                </View>
                <View style={styles.featureItem}>
                  <Feather name="check-circle" size={16} color="#7DB87A" />
                  <Text style={styles.featureText}>Site Updates</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardActionText}>Open Dashboard →</Text>
              </View>

              {/* Role badge */}
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>EMPLOYEE</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Client Management Card */}
          <Animated.View style={[{ transform: [{ scale: cardScale2 }] }]}>
            <TouchableOpacity
              style={styles.clientManagementCard}
              activeOpacity={0.9}
              onPressIn={() => handleCardPressIn(cardScale2)}
              onPressOut={() => handleCardPressOut(cardScale2)}
              onPress={handleClientManagementPress}>
              <LinearGradient
                colors={['#D4AF37', '#8B6508']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.clientManagementGradient}>
                <View style={[styles.cardIconContainer, styles.clientIconContainer]}>
                  <Feather name="layout" size={40} color="#000" />
                </View>
                <Text style={[styles.cardTitle, styles.clientCardTitle]}>Client Management</Text>
                <Text style={[styles.cardDescription, styles.clientCardDescription]}>
                  Manage projects, designs, and clients
                </Text>
              </LinearGradient>
              <View style={styles.cardFeatures}>
                <View style={styles.featureItem}>
                  <Feather name="plus-square" size={16} color="#000" />
                  <Text style={[styles.featureText, styles.clientFeatureText]}>Create Projects</Text>
                </View>
                <View style={styles.featureItem}>
                  <Feather name="users" size={16} color="#000" />
                  <Text style={[styles.featureText, styles.clientFeatureText]}>Assign Team</Text>
                </View>
                <View style={styles.featureItem}>
                  <Feather name="upload" size={16} color="#000" />
                  <Text style={[styles.featureText, styles.clientFeatureText]}>Upload Invoices</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={[styles.cardActionText, styles.clientActionText]}>Open Dashboard →</Text>
              </View>

              {/* Role badge */}
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>DESIGNER</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Executive Team Card */}
          <Animated.View style={[{ transform: [{ scale: cardScale3 }] }]}>
            <TouchableOpacity
              style={styles.executiveCard}
              activeOpacity={0.9}
              onPressIn={() => handleCardPressIn(cardScale3)}
              onPressOut={() => handleCardPressOut(cardScale3)}
              onPress={handleExecutivePress}>
              <LinearGradient
                colors={['#2E7D32', '#1B5E20']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.executiveGradient}>
                <View style={[styles.cardIconContainer, styles.executiveIconContainer]}>
                  <Feather name="hard-hat" size={40} color="#fff" />
                </View>
                <Text style={[styles.cardTitle, styles.executiveCardTitle]}>Executive Team</Text>
                <Text style={[styles.cardDescription, styles.executiveCardDescription]}>
                  Site updates, photos & progress tracking
                </Text>
              </LinearGradient>
              <View style={styles.cardFeaturesSmall}>
                <View style={styles.featureItem}>
                  <Feather name="camera" size={16} color="#2E7D32" />
                  <Text style={styles.featureText}>Upload Photos</Text>
                </View>
                <View style={styles.featureItem}>
                  <Feather name="clock" size={16} color="#2E7D32" />
                  <Text style={styles.featureText}>Timeline Updates</Text>
                </View>
                <View style={styles.featureItem}>
                  <Feather name="trending-up" size={16} color="#2E7D32" />
                  <Text style={styles.featureText}>Progress Tracking</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <Text style={[styles.cardActionText, { color: '#2E7D32' }]}>Open Dashboard →</Text>
              </View>

              {/* Role badge */}
              <View style={styles.executiveBadge}>
                <Text style={styles.executiveBadgeText}>EXECUTIVE</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Bottom hint */}
        <View style={styles.bottomHint}>
          <Feather name="info" size={16} color="#7487C1" />
          <Text style={styles.hintText}>
            You can switch between dashboards anytime
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF7EE',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.9,
  },
  blob: {
    position: 'absolute',
    borderRadius: width,
    opacity: 0.4,
  },
  blob1: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: 'rgba(62, 96, 216, 0.3)',
    top: -width * 0.2,
    left: -width * 0.2,
  },
  blob2: {
    width: width * 0.4,
    height: width * 0.4,
    backgroundColor: 'rgba(86, 111, 224, 0.25)',
    top: height * 0.3,
    right: -width * 0.1,
  },
  blob3: {
    width: width * 0.5,
    height: width * 0.5,
    backgroundColor: 'rgba(116, 135, 193, 0.2)',
    bottom: height * 0.4,
    left: -width * 0.15,
  },
  blob4: {
    width: width * 0.3,
    height: width * 0.3,
    backgroundColor: 'rgba(251, 247, 238, 0.5)',
    top: height * 0.6,
    right: width * 0.2,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: height * 0.15,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1B2540',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 18,
    color: '#7487C1',
    textAlign: 'center',
    fontWeight: '500',
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 30,
  },
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(62, 96, 216, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  clientManagementCard: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  clientManagementGradient: {
    flex: 1,
    borderRadius: 24,
    padding: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  cardIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(62, 96, 216, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  clientIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B2540',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  clientCardTitle: {
    color: '#fff',
  },
  cardDescription: {
    fontSize: 16,
    color: '#7487C1',
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '500',
  },
  clientCardDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cardFeatures: {
    gap: 12,
    marginBottom: 25,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#1B2540',
    fontWeight: '600',
  },
  clientFeatureText: {
    color: 'rgba(255, 255, 255, 0.95)',
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  cardActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3E60D8',
  },
  clientActionText: {
    color: '#fff',
  },
  premiumBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1B2540',
    letterSpacing: 1,
  },
  bottomHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 30,
    paddingHorizontal: 20,
  },
  hintText: {
    fontSize: 14,
    color: '#7487C1',
    fontWeight: '500',
  },
  // Executive Card Styles
  executiveCard: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  executiveGradient: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 30,
    paddingBottom: 20,
  },
  executiveIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  executiveCardTitle: {
    color: '#fff',
  },
  executiveCardDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 0,
  },
  cardFeaturesSmall: {
    gap: 10,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  executiveBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#81C784',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  executiveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1B5E20',
    letterSpacing: 1,
  },
  roleBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(184, 134, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D4AF37',
    letterSpacing: 1,
  },
});

export default LoginSelectionScreen;