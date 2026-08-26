import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfile {
  final String uid;
  final String? name;
  final String? phoneNumber;
  final String? email;
  final String? photoUrl;
  final String? role;
  final String? district;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const UserProfile({
    required this.uid,
    this.name,
    this.phoneNumber,
    this.email,
    this.photoUrl,
    this.role = 'citizen',
    this.district,
    this.createdAt,
    this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'name': name,
      'phoneNumber': phoneNumber,
      'email': email,
      'photoUrl': photoUrl,
      'role': role == 'citizen' ? role : 'citizen',
      'district': district,
      'createdAt': createdAt == null ? null : Timestamp.fromDate(createdAt!),
      'updatedAt': updatedAt == null ? null : Timestamp.fromDate(updatedAt!),
    };
  }

  static DateTime? _dateFromValue(dynamic value) {
    if (value is Timestamp) return value.toDate();
    if (value is DateTime) return value;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  factory UserProfile.fromMap(Map<String, dynamic> map) {
    return UserProfile(
      uid: map['uid'] ?? '',
      name: map['name'],
      phoneNumber: map['phoneNumber'] ?? map['phone'],
      email: map['email'],
      photoUrl: map['photoUrl'],
        role: map['role'] == 'pdma_officer' || map['role'] == 'admin'
          ? 'citizen'
          : (map['role'] ?? 'citizen'),
      district: map['district'],
        createdAt: _dateFromValue(map['createdAt']),
        updatedAt: _dateFromValue(map['updatedAt']),
    );
  }
}
