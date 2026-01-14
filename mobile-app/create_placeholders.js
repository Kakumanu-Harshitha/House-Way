const fs = require('fs');
const path = require('path');

const screens = [
  'projects/ProjectDetailsScreen',
  'users/UsersScreen',
  'users/UserDetailsScreen',
  'materialRequests/MaterialRequestsScreen',
  'materialRequests/MaterialRequestDetailsScreen',
  'materialRequests/CreateMaterialRequestScreen',
  'quotations/QuotationsScreen',
  'quotations/QuotationDetailsScreen',
  'quotations/CreateQuotationScreen',
  'purchaseOrders/PurchaseOrdersScreen',
  'purchaseOrders/PurchaseOrderDetailsScreen',
  'profile/ProfileScreen'
];

const template = (screenName) => `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ${screenName} = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>${screenName.replace(/([A-Z])/g, ' $1').trim()}</Text>
      <Text style={styles.subtitle}>Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default ${screenName};
`;

screens.forEach(screenPath => {
  const screenName = path.basename(screenPath);
  const filePath = `src/screens/${screenPath}.js`;
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, template(screenName));
  console.log(`Created ${filePath}`);
});

console.log('All placeholder screens created!');
