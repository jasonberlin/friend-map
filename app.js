import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, Plus, Upload, Trash2, Edit3, Search } from 'lucide-react';

const FriendMap = () => {
  const [friends, setFriends] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFriend, setEditingFriend] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newFriend, setNewFriend] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    photo: '',
    lat: null,
    lng: null
  });
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showContactCard, setShowContactCard] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize map
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCAHA2rJUh_pVQgH_N-AFc35UEfiR5jr70&libraries=geocoding`;
    script.async = true;
    script.defer = true;
    script.onload = initMap;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initMap = () => {
    if (mapRef.current && window.google) {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 4,
        center: { lat: 39.8283, lng: -98.5795 }, // Center of US
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
      setMap(mapInstance);
    }
  };

  // Geocode address to coordinates
  const geocodeAddress = async (address) => {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps) {
        // Fallback: Mock coordinates for demo (this shouldn't happen with real API key)
        const mockCoords = {
          lat: 40.7128 + (Math.random() - 0.5) * 20,
          lng: -74.0060 + (Math.random() - 0.5) * 40
        };
        resolve(mockCoords);
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          console.error('Geocoding failed:', status);
          // Fallback coordinates for continental US
          resolve({
            lat: 39.8283 + (Math.random() - 0.5) * 10,
            lng: -98.5795 + (Math.random() - 0.5) * 20
          });
        }
      });
    });
  };

  // Add markers to map
  useEffect(() => {
    if (map && friends.length > 0) {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      
      const newMarkers = friends.map(friend => {
        if (!friend.lat || !friend.lng) return null;
        
        if (!window.google || !window.google.maps) {
          return null; // Skip if Google Maps not loaded
        }

        const marker = new window.google.maps.Marker({
          position: { lat: friend.lat, lng: friend.lng },
          map: map,
          title: friend.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#EF4444">
                <path d="M12 0C7.802 0 4.4 3.403 4.4 7.602 4.4 11.8 12 24 12 24s7.6-12.2 7.6-16.398C19.6 3.403 16.197 0 12 0zM12 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 32)
          }
        });

        marker.addListener('click', () => {
          setSelectedFriend(friend);
          setShowContactCard(true);
        });

        return marker;
      }).filter(Boolean);

      setMarkers(newMarkers);

      // Fit map to show all markers
      if (newMarkers.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        friends.forEach(friend => {
          if (friend.lat && friend.lng) {
            bounds.extend({ lat: friend.lat, lng: friend.lng });
          }
        });
        map.fitBounds(bounds);
      }
    }
  }, [map, friends]);

  const parseVCard = (vcardText) => {
    const contacts = [];
    const vcards = vcardText.split('BEGIN:VCARD');
    
    vcards.forEach((vcard, index) => {
      if (index === 0) return; // Skip empty first element
      
      const lines = vcard.split('\n').map(line => line.trim()).filter(line => line);
      const contact = { id: Date.now() + index };
      
      lines.forEach(line => {
        if (line.startsWith('FN:') || line.startsWith('N:')) {
          // Full name or structured name
          if (line.startsWith('FN:')) {
            contact.name = line.substring(3).trim();
          } else if (line.startsWith('N:') && !contact.name) {
            const nameParts = line.substring(2).split(';');
            contact.name = `${nameParts[1] || ''} ${nameParts[0] || ''}`.trim();
          }
        } else if (line.startsWith('TEL')) {
          // Phone number
          const phoneMatch = line.match(/TEL[^:]*:(.*)/);
          if (phoneMatch && !contact.phone) {
            contact.phone = phoneMatch[1].trim();
          }
        } else if (line.startsWith('EMAIL')) {
          // Email address
          const emailMatch = line.match(/EMAIL[^:]*:(.*)/);
          if (emailMatch && !contact.email) {
            contact.email = emailMatch[1].trim();
          }
        } else if (line.startsWith('PHOTO')) {
          // Photo data
          const photoMatch = line.match(/PHOTO[^:]*:(.*)/);
          if (photoMatch) {
            contact.photo = photoMatch[1].trim();
          }
        } else if (line.startsWith('ADR')) {
          // Address parsing - vCard format: ;;street;city;state;zip;country
          const addrMatch = line.match(/ADR[^:]*:(.*)/);
          if (addrMatch) {
            const addrParts = addrMatch[1].split(';');
            contact.address = addrParts[2] || '';
            contact.city = addrParts[3] || '';
            contact.state = addrParts[4] || '';
            contact.zipCode = addrParts[5] || '';
          }
        } else if (line.includes('WORK') && line.includes('ADR')) {
          // Work address
          const addrMatch = line.match(/ADR[^:]*:(.*)/);
          if (addrMatch && !contact.address) {
            const addrParts = addrMatch[1].split(';');
            contact.address = addrParts[2] || '';
            contact.city = addrParts[3] || '';
            contact.state = addrParts[4] || '';
            contact.zipCode = addrParts[5] || '';
          }
        }
      });
      
      if (contact.name && (contact.address || contact.city)) {
        contacts.push(contact);
      }
    });
    
    return contacts;
  };

  const handleAddFriend = async () => {
    if (!newFriend.name || !newFriend.address || !newFriend.city || !newFriend.state) {
      return; // Basic validation
    }
    
    const fullAddress = `${newFriend.address}, ${newFriend.city}, ${newFriend.state} ${newFriend.zipCode}`;
    
    try {
      const coords = await geocodeAddress(fullAddress);
      const friendWithCoords = {
        ...newFriend,
        id: Date.now(),
        lat: coords.lat,
        lng: coords.lng
      };
      
      if (editingFriend) {
        setFriends(friends.map(f => f.id === editingFriend.id ? friendWithCoords : f));
        setEditingFriend(null);
      } else {
        setFriends([...friends, friendWithCoords]);
      }
      
      setNewFriend({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        email: '',
        photo: '',
        lat: null,
        lng: null
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
  };

  const handleEditFriend = (friend) => {
    setNewFriend(friend);
    setEditingFriend(friend);
    setShowAddForm(true);
    setShowContactCard(false);
  };

  const handleDeleteFriend = (id) => {
    setFriends(friends.filter(f => f.id !== id));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      let newFriends = [];
      
      if (file.name.toLowerCase().endsWith('.vcf') || content.includes('BEGIN:VCARD')) {
        // Handle vCard (.vcf) files - Apple's default export format
        const vcardContacts = parseVCard(content);
        
        for (const contact of vcardContacts) {
          if (contact.name && (contact.address || contact.city)) {
            const fullAddress = contact.address ? 
              `${contact.address}, ${contact.city}, ${contact.state} ${contact.zipCode}` :
              `${contact.city}, ${contact.state} ${contact.zipCode}`;
            
            try {
              const coords = await geocodeAddress(fullAddress.trim());
              newFriends.push({
                ...contact,
                lat: coords.lat,
                lng: coords.lng
              });
            } catch (error) {
              console.error('Error geocoding address for:', contact.name);
            }
          }
        }
      } else if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
        // Handle CSV files
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length >= headers.length && values[0]) {
            // Try different common column names
            const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('display'));
            const addressIdx = headers.findIndex(h => h.includes('address') || h.includes('street'));
            const cityIdx = headers.findIndex(h => h.includes('city'));
            const stateIdx = headers.findIndex(h => h.includes('state') || h.includes('region'));
            const zipIdx = headers.findIndex(h => h.includes('zip') || h.includes('postal'));
            const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('tel'));
            const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'));
            
            const friend = {
              id: Date.now() + i,
              name: nameIdx >= 0 ? values[nameIdx] : values[0],
              address: addressIdx >= 0 ? values[addressIdx] : '',
              city: cityIdx >= 0 ? values[cityIdx] : '',
              state: stateIdx >= 0 ? values[stateIdx] : '',
              zipCode: zipIdx >= 0 ? values[zipIdx] : '',
              phone: phoneIdx >= 0 ? values[phoneIdx] : '',
              email: emailIdx >= 0 ? values[emailIdx] : '',
              photo: ''
            };
            
            if (friend.name && (friend.address || friend.city)) {
              const fullAddress = friend.address ? 
                `${friend.address}, ${friend.city}, ${friend.state} ${friend.zipCode}` :
                `${friend.city}, ${friend.state} ${friend.zipCode}`;
              
              try {
                const coords = await geocodeAddress(fullAddress.trim());
                friend.lat = coords.lat;
                friend.lng = coords.lng;
                newFriends.push(friend);
              } catch (error) {
                console.error('Error geocoding address for:', friend.name);
              }
            }
          }
        }
      }
      
      if (newFriends.length > 0) {
        setFriends([...friends, ...newFriends]);
      } else {
        alert('No contacts with addresses found in the file. Please make sure your contacts include address information.');
      }
    };
    reader.readAsText(file);
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <MapPin className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Friend Map</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center text-gray-600">
                <Users className="h-5 w-5 mr-2" />
                {friends.length} friends
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Your Friends</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </button>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 flex items-center"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Import
                  </button>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.vcf"
                className="hidden"
              />

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search friends..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Friends List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{friend.name}</h3>
                      <p className="text-sm text-gray-600">{friend.city}, {friend.state}</p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditFriend(friend)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFriend(friend.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {friends.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No friends added yet.</p>
                  <p className="text-sm">Add your first friend to get started!</p>
                </div>
              )}

              {/* Import Instructions */}
              <div className="mt-6 p-4 bg-blue-50 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-3">📱 How to Import Your Apple Contacts</h4>
                
                <div className="space-y-3 text-xs text-blue-700">
                  <div>
                    <div className="font-medium mb-1">Method 1: iCloud.com (Recommended)</div>
                    <div className="ml-2 space-y-1">
                      <div>1. Go to <span className="font-mono">icloud.com</span> → Sign in</div>
                      <div>2. Click "Contacts"</div>
                      <div>3. Click gear icon → "Select All"</div>
                      <div>4. Click gear icon → "Export vCard"</div>
                      <div>5. Upload the downloaded .vcf file here</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium mb-1">Method 2: Mac Contacts App</div>
                    <div className="ml-2 space-y-1">
                      <div>1. Open Contacts app on Mac</div>
                      <div>2. Select All (Cmd+A)</div>
                      <div>3. File → Export → Export vCard</div>
                      <div>4. Upload the .vcf file here</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium mb-1">Method 3: iPhone Apps</div>
                    <div className="ml-2">
                      <div>Download "Export Contacts" from App Store for direct CSV export</div>
                    </div>
                  </div>
                  
                  <div className="mt-2 p-2 bg-amber-50 rounded border-l-2 border-amber-400">
                    <div className="font-medium text-amber-800">💡 Tips:</div>
                    <div className="text-amber-700">
                      • Only contacts with addresses will appear on the map<br/>
                      • vCard (.vcf) files work best with Apple contacts<br/>
                      • You can also manually add friends one by one
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div
                ref={mapRef}
                className="w-full h-96 lg:h-[600px]"
                style={{ background: '#f3f4f6' }}
              >
                {!window.google && (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Loading Google Maps...</p>
                      <p className="text-xs mt-2">Using your active API key</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Friend Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingFriend ? 'Edit Friend' : 'Add New Friend'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={newFriend.name}
                onChange={(e) => setNewFriend({...newFriend, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Street Address"
                value={newFriend.address}
                onChange={(e) => setNewFriend({...newFriend, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City"
                  value={newFriend.city}
                  onChange={(e) => setNewFriend({...newFriend, city: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="State"
                  value={newFriend.state}
                  onChange={(e) => setNewFriend({...newFriend, state: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="ZIP Code"
                value={newFriend.zipCode}
                onChange={(e) => setNewFriend({...newFriend, zipCode: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Phone (optional)"
                value={newFriend.phone}
                onChange={(e) => setNewFriend({...newFriend, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="email"
                placeholder="Email (optional)"
                value={newFriend.email}
                onChange={(e) => setNewFriend({...newFriend, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleAddFriend}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                >
                  {editingFriend ? 'Update' : 'Add'} Friend
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingFriend(null);
                    setNewFriend({
                      name: '',
                      address: '',
                      city: '',
                      state: '',
                      zipCode: '',
                      phone: '',
                      email: '',
                      photo: '',
                      lat: null,
                      lng: null
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Card Modal */}
      {showContactCard && selectedFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm relative">
            {/* Close button */}
            <button
              onClick={() => setShowContactCard(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Profile section */}
            <div className="text-center mb-6">
              {selectedFriend.photo ? (
                <img
                  src={selectedFriend.photo.startsWith('data:') ? selectedFriend.photo : `data:image/jpeg;base64,${selectedFriend.photo}`}
                  alt={selectedFriend.name}
                  className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-blue-100"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold ${selectedFriend.photo ? 'hidden' : 'flex'}`}
              >
                {selectedFriend.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedFriend.name}</h3>
            </div>

            {/* Contact details */}
            <div className="space-y-4">
              {selectedFriend.phone && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900 font-medium">{selectedFriend.phone}</p>
                  </div>
                </div>
              )}

              {selectedFriend.email && (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900 font-medium">{selectedFriend.email}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-gray-900 font-medium">
                    {selectedFriend.address && `${selectedFriend.address}, `}
                    {selectedFriend.city}, {selectedFriend.state} {selectedFriend.zipCode}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {selectedFriend.phone && (
                
                  href={`tel:${selectedFriend.phone}`}
                  className="bg-green-600 text-white py-2 px-4 rounded-lg text-center text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Call
                </a>
              )}
              {selectedFriend.email && (
                
                  href={`mailto:${selectedFriend.email}`}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg text-center text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Email
                </a>
              )}
              <button
                onClick={() => handleEditFriend(selectedFriend)}
                className="bg-gray-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors col-span-1"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendMap;