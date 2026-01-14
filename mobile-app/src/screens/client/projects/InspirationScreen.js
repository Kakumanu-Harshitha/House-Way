import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";

// Categories including "All"
const categoriesData = [
  { id: "0", title: "All", selected: true },
  { id: "1", title: "Design Trends", selected: false },
  { id: "2", title: "Style Guides", selected: false },
  { id: "3", title: "Maintenance", selected: false },
  { id: "4", title: "DIY", selected: false },
];

// Articles with real images and categories
const articlesData = [
  {
    id: "1",
    title: "Modern Interior Design Essentials",
    description: "Discover minimalist aesthetics and functional layouts.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    category: "Design Trends",
  },
  {
    id: "2",
    title: "Color Palette Tips",
    description: "Choose the perfect colors to reflect your style.",
    image: "https://images.unsplash.com/photo-1582719478250-07deef5d6d20?auto=format&fit=crop&w=800&q=80",
    category: "Style Guides",
  },
  {
    id: "3",
    title: "Furniture Maintenance Hacks",
    description: "Keep your furniture looking new for years.",
    image: "https://images.unsplash.com/photo-1598300057905-c2c4f1587c6b?auto=format&fit=crop&w=800&q=80",
    category: "Maintenance",
  },
  {
    id: "4",
    title: "Minimalist Home Decor Ideas",
    description: "Clutter-free designs for modern living.",
    image: "https://images.unsplash.com/photo-1616626933874-1d423ad6e6a7?auto=format&fit=crop&w=800&q=80",
    category: "Design Trends",
  },
  {
    id: "5",
    title: "DIY Wall Art Projects",
    description: "Create beautiful personalized wall art at home.",
    image: "https://images.unsplash.com/photo-1605902711622-cfb43c4436b5?auto=format&fit=crop&w=800&q=80",
    category: "DIY",
  },
];

const KnowledgePage = () => {
  const route = useRoute();
  const { projectId } = route.params || {};

  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState(categoriesData);
  const [bookmarks, setBookmarks] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [articles, setArticles] = useState(articlesData);
  const [isLoading, setIsLoading] = useState(false);

  // You can optionally load project-specific inspiration articles here
  // For now, using general articles as a knowledge base
  useEffect(() => {
    // If you want to fetch project-specific inspiration/articles from backend:
    // loadProjectInspiration();
    setArticles(articlesData);
  }, [projectId]);

  const selectCategory = (id) => {
    const updated = categories.map((cat) => ({
      ...cat,
      selected: cat.id === id,
    }));
    setCategories(updated);
  };

  const toggleBookmark = (article) => {
    if (bookmarks.some((b) => b.id === article.id)) {
      setBookmarks(bookmarks.filter((b) => b.id !== article.id));
    } else {
      setBookmarks([...bookmarks, article]);
    }
  };

  const selectedCategory = categories.find((cat) => cat.selected)?.title;

  const displayedArticles = (activeTab === "All" ? articles : bookmarks)
    .filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    .filter((a) =>
      selectedCategory === "All" ? true : a.category === selectedCategory
    );

  const featuredArticle = displayedArticles[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {isLoading ? (
        <View style={[styles.centerContent, { flex: 1 }]}>
          <ActivityIndicator size="large" color="#1a3a6b" />
          <Text style={styles.loadingText}>Loading inspiration...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ padding: 16 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity>
              <Ionicons name="arrow-back" size={24} color="#0a142f" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Knowledge Hub</Text>
            <TouchableOpacity>
              <Ionicons name="bookmark-outline" size={24} color="#0a142f" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color="#6b7280"
              style={{ marginLeft: 8 }}
            />
            <TextInput
              placeholder="Search articles, styles, tips..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
          </View>

          {/* Categories */}
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryBtn,
                  cat.selected ? styles.categorySelected : styles.categoryUnselected,
                ]}
                onPress={() => selectCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    cat.selected ? { color: "#1a3a6b" } : { color: "#6b7280" },
                  ]}
                >
                  {cat.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity onPress={() => setActiveTab("All")}>
              <Text style={activeTab === "All" ? styles.tabSelected : styles.tabUnselected}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab("Saved")}>
              <Text style={activeTab === "Saved" ? styles.tabSelected : styles.tabUnselected}>
                Saved
              </Text>
            </TouchableOpacity>
          </View>

          {/* Featured Article */}
          {featuredArticle && (
            <>
              <Text style={styles.sectionTitle}>Featured Article</Text>
              <View style={styles.card}>
                <Image
                  source={{ uri: featuredArticle.image }}
                  style={styles.featuredImage}
                  resizeMode="cover"
                />
                <View style={{ padding: 12 }}>
                  <Text style={styles.articleTitle}>{featuredArticle.title}</Text>
                  <Text style={styles.articleDesc}>{featuredArticle.description}</Text>
                </View>
              </View>
            </>
          )}

          {/* Latest Articles */}
          <Text style={styles.sectionTitle}>
            {activeTab === "All" ? "Latest Articles" : "Bookmarked Articles"}
          </Text>
          {displayedArticles.length === 0 ? (
            <Text style={{ color: "#6b7280", textAlign: "center", marginTop: 16 }}>
              No articles found.
            </Text>
          ) : (
            // Remove filtering out featured article for latest
            <FlatList
              data={displayedArticles} // <-- use all articles, even the featured one
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={{ marginBottom: 16 }}
              renderItem={({ item }) => (
                <View style={styles.latestCard}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.latestImage}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1, paddingHorizontal: 8 }}>
                    <Text style={styles.articleTitle}>{item.title}</Text>
                    <Text style={styles.articleDesc}>{item.description}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleBookmark(item)}>
                    <Ionicons
                      name={
                        bookmarks.some((b) => b.id === item.id)
                          ? "bookmark"
                          : "bookmark-outline"
                      }
                      size={24}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />

          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default KnowledgePage;

const COLORS = {
  primary: '#D4AF37',        // Dark Golden Rod
  primaryLight: 'rgba(184, 134, 11, 0.15)',
  background: '#FFFFFF',     // Clean White
  cardBg: '#FFFFFF',         // White
  cardBorder: 'rgba(184, 134, 11, 0.1)',
  text: '#1A1A1A',           // Dark text
  textMuted: '#666666',      // Muted text
  accent: '#FFF8E7',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 150,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 40,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.text, letterSpacing: 0.5 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    marginBottom: 24,
    height: 54,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, paddingHorizontal: 12, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    marginBottom: 24
  },
  tabSelected: {
    borderBottomWidth: 3,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
    marginRight: 24
  },
  tabUnselected: {
    borderBottomWidth: 3,
    borderColor: "transparent",
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginRight: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  featuredImage: { width: "100%", height: 220 },
  articleTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, lineHeight: 22 },
  articleDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 6, lineHeight: 20 },
  categoryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
  },
  categorySelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryUnselected: {
    backgroundColor: COLORS.cardBg,
    borderColor: COLORS.cardBorder,
  },
  categoryText: { fontSize: 13, fontWeight: "700" },
  latestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  latestImage: { width: 70, height: 70, borderRadius: 14 },
  centerContent: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.textMuted },
});
