import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { projectsAPI, dashboardAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import CommonHeader from '../../components/CommonHeader';
import theme from '../../styles/theme';

const { width, height } = Dimensions.get("window");

export default function ClientDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [clientStats, setClientStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalMaterialRequests: 0,
    pendingMaterialRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState("#F4F1ED");
  const dropZone = { x: width * 0.15, y: height * 0.35, w: width * 0.7, h: 160 };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Check if user is authenticated
      if (!user || !user._id) {
        console.error('User not authenticated');
        setLoading(false);
        return;
      }

      console.log('[ClientDashboard] Fetching data for user:', user._id);

      // Fetch client stats, projects, and recent activities in parallel
      const [statsRes, projectsRes, activitiesRes] = await Promise.allSettled([
        dashboardAPI.getClientStats(),
        projectsAPI.getProjects({ client: user._id, limit: 50 }),
        dashboardAPI.getRecentActivity(5) // Get last 5 activities
      ]);

      // Process stats
      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setClientStats(statsRes.value.data);
      } else if (statsRes.status === 'rejected') {
        console.error('Failed to fetch client stats:', statsRes.reason);
      }

      // Process projects
      if (projectsRes.status === 'fulfilled' && projectsRes.value.success) {
        const projectsData = Array.isArray(projectsRes.value.data?.projects)
          ? projectsRes.value.data.projects
          : [];
        setProjects(projectsData);
      } else if (projectsRes.status === 'rejected') {
        console.error('Failed to fetch projects:', projectsRes.reason);
      }

      // Process recent activities
      if (activitiesRes.status === 'fulfilled' && activitiesRes.value.success) {
        setRecentActivities(activitiesRes.value.data.activities || []);
      } else if (activitiesRes.status === 'rejected') {
        console.error('Failed to fetch recent activities:', activitiesRes.reason);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: selectedColor }]}>
      <CommonHeader title="Dashboard" userRole="Client" showNotifications={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        bounces={Platform.OS !== 'web'}
        scrollEventThrottle={16}
      >
        <Text style={styles.header}>Moodboard Wall</Text>
        <Text style={styles.subHeader}>Welcome back, {user?.firstName}! Here's your design board.</Text>
        {user?.clientId && (
          <Text style={styles.clientIdText}>Client ID: {user.clientId}</Text>
        )}

        {/* Example pinned note */}
        <View style={[styles.noteCard, { top: 140, left: 20, transform: [{ rotate: "-6deg" }] }]}>
          <Text style={styles.handwritten}>Style Guide</Text>
          <View style={styles.paletteRow}>
            {["#F5F5F0", "#E6D7BB", "#D4AF37", "#1A1A1A"].map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                style={[styles.paletteSwatch, { backgroundColor: color }]}
              />
            ))}
          </View>
        </View>

        {/* Vendor spotlight */}
        <View style={[styles.vendorCard, { top: 220, left: 20, transform: [{ rotate: "2deg" }] }]}>
          <Text style={styles.vendorTitle}>Curated Vendors</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Image
              source={{ uri: "https://logo.clearbit.com/rh.com" }}
              style={{ width: 60, height: 20, resizeMode: "contain", opacity: 0.8 }}
            />
            <Image
              source={{ uri: "https://logo.clearbit.com/arhaus.com" }}
              style={{ width: 60, height: 20, resizeMode: "contain", opacity: 0.8 }}
            />
          </View>
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>Design Tip</Text>
          <Text style={styles.noteText}>Natural light enhances the warm tones in your palette. Consider sheer drapes.</Text>
        </View>

        {/* Drop Zone */}
        <View style={styles.dropZone}>
          <Text style={styles.dropText}>DRAG PROJECT HERE</Text>
          <Text style={styles.dropSub}>to explore details</Text>
        </View>

        {/* Dynamic Project Tiles */}
        {projects.map((project, i) => (
          <DraggableTile
            key={project._id}
            project={project}
            dropZone={dropZone}
            i={i}
          />
        ))}
        
        {/* Extra space for scrolling */}
        <View style={{ height: 200 }} />
      </ScrollView>
    </GestureHandlerRootView>
  );
}

function DraggableTile({ project, dropZone, i }) {
  const navigation = useNavigation();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const dropped = useSharedValue(false);

  const rotation = (i % 2 === 0 ? 1 : -2) + Math.random() * 2;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: withSpring(scale.value) },
      { rotate: `${rotation}deg` },
    ],
    opacity: dropped.value ? 0.95 : 1,
  }));

  const handleDrop = (x, y) => {
    const inside =
      x > dropZone.x &&
      x < dropZone.x + dropZone.w &&
      y > dropZone.y &&
      y < dropZone.y + dropZone.h;

    if (inside) {
      dropped.value = true;
      scale.value = 0.8;
      navigation.navigate("Projects", {
        screen: "ProjectDetails",
        params: { projectId: project._id },
      });
    } else {
      dropped.value = false;
      scale.value = 1;
    }
  };

  // Import Gesture here to avoid undefined error
  const Gesture = require('react-native-gesture-handler').Gesture;
  const GestureDetector = require('react-native-gesture-handler').GestureDetector;

  const pan = Gesture.Pan()
    .onStart(() => {
      scale.value = 0.9;
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;

      const inside =
        e.absoluteX > dropZone.x &&
        e.absoluteX < dropZone.x + dropZone.w &&
        e.absoluteY > dropZone.y &&
        e.absoluteY < dropZone.y + dropZone.h;

      scale.value = inside ? 0.6 : 0.9;
    })
    .onEnd((e) => {
      runOnJS(handleDrop)(e.absoluteX, e.absoluteY);
    });

  // ✅ Grid layout instead of random positioning
  const cardWidth = 150;
  const cardHeight = 200;
  const baseTop = 300 + Math.floor(i / 2) * (cardHeight * 0.6); // 40% overlap
  const baseLeft = 20 + (i % 2) * (cardWidth * 0.7); // side shift

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.tile,
          {
            top: baseTop,
            left: baseLeft,
          },
          animatedStyle,
        ]}
      >
        <ImageBackground
          source={{ uri: project.images?.[0]?.url || project.thumbnail || "https://picsum.photos/200" }}
          style={styles.tileImage}
          imageStyle={{ borderRadius: 16 }}
        >
          <View style={styles.overlay}>
            <Text style={styles.tileTitle} numberOfLines={1}>{project.title}</Text>
            <View style={styles.tileProgressContainer}>
              <View style={[styles.tileProgressBar, { width: `${project.progress?.percentage || 0}%` }]} />
            </View>
            <Text style={styles.tileStatus}>
              {project.progress?.percentage || 0}% • {project.status?.toUpperCase()}
            </Text>
          </View>
        </ImageBackground>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#FFFFFF' },
  header: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 60,
    marginBottom: 10,
    color: theme.colors.text.primary,
    letterSpacing: 1,
  },
  subHeader: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 5,
    fontWeight: '500',
  },
  clientIdText: {
    fontSize: 12,
    color: theme.colors.primary[500],
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dropZone: {
    position: "absolute",
    top: height * 0.32,
    left: width * 0.1,
    width: width * 0.8,
    height: 140,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.colors.primary[300],
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dropText: { fontSize: 16, fontWeight: "700", color: theme.colors.primary[600], letterSpacing: 0.5 },
  dropSub: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 4 },
  tile: {
    width: 160,
    height: 220,
    position: "absolute",
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    overflow: 'hidden',
  },
  tileImage: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
  },
  tileTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 6,
  },
  tileStatus: {
    color: theme.colors.text.brand,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  tileProgressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  tileProgressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
  },
  noteCard: {
    position: "absolute",
    width: 130,
    backgroundColor: '#FFF9C4', // Classic post-it yellow
    padding: 12,
    borderRadius: 4,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.05)',
  },
  handwritten: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    color: '#5D4037',
  },
  paletteRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  paletteSwatch: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  vendorCard: {
    position: "absolute",
    width: 150,
    backgroundColor: theme.colors.background.card,
    padding: 12,
    borderRadius: 12,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  vendorTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    color: theme.colors.text.primary,
  },
  activitiesSection: {
    position: 'absolute',
    width: 200,
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  activitiesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activitiesList: {
    gap: 8,
  },
  activityItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.primary,
  },
  activityText: {
    fontSize: 12,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  noActivityText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noteBox: {
    position: "absolute",
    top: 90,
    right: 20,
    width: 150,
    height: 130,
    backgroundColor: "#E1F5FE", // Soft blue note
    borderRadius: 4,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    transform: [{ rotate: "-3deg" }],
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    color: "#0277BD",
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#01579B",
    fontWeight: '500',
  }
});