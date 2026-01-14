import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { webStyles, isWeb, isLargeScreen, getResponsiveValue } from '../../styles/webStyles';
import ApiDebugger from '../../components/ApiDebugger';

const GuestScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    console.log('[GuestScreen] Component mounted');
  }, []);

  console.log('[GuestScreen] Rendering component');

  return (
    <ScrollView style={{...styles.container, ...webStyles.webContainer}}>
      {__DEV__ ? <ApiDebugger /> : null}
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🏠</Text>
          <Text style={styles.companyName}>Houseway</Text>
          <Text style={styles.tagline}>House Design Company</Text>
        </View>

        <View style={styles.authButtons}>
          <TouchableOpacity
            style={{...styles.button, ...styles.loginButton}}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{...styles.button, ...styles.registerButton}}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>
          Transform Your Dream Home Into Reality
        </Text>
        <Text style={styles.heroSubtitle}>
          Professional house design services with expert architects and designers
        </Text>
      </View>

      {/* Services Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Services</Text>
        
        <View style={styles.servicesGrid}>
          <View style={styles.serviceCard}>
            <Text style={styles.serviceIcon}>🏗️</Text>
            <Text style={styles.serviceTitle}>Residential Design</Text>
            <Text style={styles.serviceDescription}>
              Custom home designs tailored to your lifestyle and preferences
            </Text>
          </View>
          
          <View style={styles.serviceCard}>
            <Text style={styles.serviceIcon}>🏢</Text>
            <Text style={styles.serviceTitle}>Commercial Design</Text>
            <Text style={styles.serviceDescription}>
              Professional commercial spaces that enhance your business
            </Text>
          </View>
          
          <View style={styles.serviceCard}>
            <Text style={styles.serviceIcon}>🔨</Text>
            <Text style={styles.serviceTitle}>Renovation</Text>
            <Text style={styles.serviceDescription}>
              Transform existing spaces with modern design solutions
            </Text>
          </View>
          
          <View style={styles.serviceCard}>
            <Text style={styles.serviceIcon}>🎨</Text>
            <Text style={styles.serviceTitle}>Interior Design</Text>
            <Text style={styles.serviceDescription}>
              Beautiful interiors that reflect your personal style
            </Text>
          </View>
        </View>
      </View>

      {/* Portfolio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Projects</Text>
        <Text style={styles.sectionSubtitle}>
          Explore our latest completed projects
        </Text>
        
        <View style={styles.portfolioGrid}>
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.portfolioCard}>
              <View style={styles.portfolioImage}>
                <Text style={styles.portfolioPlaceholder}>🏠</Text>
              </View>
              <Text style={styles.portfolioTitle}>Modern Villa {item}</Text>
              <Text style={styles.portfolioDescription}>
                Contemporary design with sustainable features
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Contact Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Get Started</Text>
        <Text style={styles.sectionSubtitle}>
          Ready to begin your dream project?
        </Text>
        
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.ctaButtonText}>Start Your Project</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2024 Houseway. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
    }),
  },
  header: {
    padding: getResponsiveValue(15, 20, 30),
    paddingTop: getResponsiveValue(30, 40, 50),
    backgroundColor: '#f8f9fa',
    ...(Platform.OS === 'web' && {
      maxWidth: 1200,
      marginHorizontal: 'auto',
      width: '100%',
    }),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 60,
    marginBottom: 5,
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  authButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  loginButtonText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#2196F3',
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  heroSection: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 15,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  section: {
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' && isLargeScreen && {
      justifyContent: 'space-around',
    }),
  },
  serviceCard: {
    width: getResponsiveValue('48%', '48%', '22%'),
    backgroundColor: '#f8f9fa',
    padding: getResponsiveValue(15, 20, 25),
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
    }),
  },
  serviceIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  portfolioCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    // Mobile shadows
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Web shadows
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    }),
  },
  portfolioImage: {
    height: 120,
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioPlaceholder: {
    fontSize: 40,
    color: '#ccc',
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    padding: 15,
    paddingBottom: 5,
  },
  portfolioDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  ctaButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 10,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
});

export default GuestScreen;