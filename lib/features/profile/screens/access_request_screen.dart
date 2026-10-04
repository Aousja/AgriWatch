import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:iconsax/iconsax.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/services/local_storage_service.dart';
import '../services/access_request_service.dart';

class _CnicFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final limited = digits.substring(0, digits.length > 13 ? 13 : digits.length);
    var formatted = limited;
    if (limited.length > 5) {
      formatted = '${limited.substring(0, 5)}-${limited.substring(5)}';
    }
    if (limited.length > 12) {
      formatted = '${limited.substring(0, 5)}-${limited.substring(5, 12)}-${limited.substring(12)}';
    }
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

class AccessRequestScreen extends StatefulWidget {
  const AccessRequestScreen({super.key});

  @override
  State<AccessRequestScreen> createState() => _AccessRequestScreenState();
}

class _AccessRequestScreenState extends State<AccessRequestScreen> {
  final _service = AccessRequestService();
  final _nameController = TextEditingController();
  final _organizationController = TextEditingController();
  final _designationController = TextEditingController();
  final _phoneController = TextEditingController();
  final _reasonController = TextEditingController();
  final _cnicController = TextEditingController();
  final _departmentController = TextEditingController();
  final _employeeIdController = TextEditingController();
  final _officialEmailController = TextEditingController();
  final _organizationTypeController = TextEditingController();
  final _registrationNumberController = TextEditingController();
  String _requestedRole = 'officer';
  String? _province;
  String? _district;
  String? _operationalProvince;
  String? _operationalDistrict;
  bool _loading = true;
  bool _submitting = false;
  bool _pending = false;

  static const _provinces = [
    'Punjab',
    'Sindh',
    'Balochistan',
    'Khyber Pakhtunkhwa',
    'Azad Jammu and Kashmir',
  ];
  static const _districts = {
    'Punjab': [
      'Attock',
      'Bahawalnagar',
      'Bahawalpur',
      'Bhakkar',
      'Chakwal',
      'Chiniot',
      'Dera Ghazi Khan',
      'Faisalabad',
      'Gujranwala',
      'Gujrat',
      'Hafizabad',
      'Jhang',
      'Jhelum',
      'Kasur',
      'Khanewal',
      'Khushab',
      'Lahore',
      'Layyah',
      'Lodhran',
      'Mandi Bahauddin',
      'Mianwali',
      'Multan',
      'Murree',
      'Muzaffargarh',
      'Nankana Sahib',
      'Narowal',
      'Okara',
      'Pakpattan',
      'Rahim Yar Khan',
      'Rajanpur',
      'Rawalpindi',
      'Sahiwal',
      'Sargodha',
      'Sheikhupura',
      'Sialkot',
      'Talagang',
      'Taunsa',
      'Toba Tek Singh',
      'Vehari',
      'Wazirabad',
      'Kot Addu',
    ],
    'Sindh': [
      'Badin',
      'Dadu',
      'Ghotki',
      'Hyderabad',
      'Jacobabad',
      'Jamshoro',
      'Karachi Central',
      'Karachi East',
      'Karachi South',
      'Karachi West',
      'Kashmore',
      'Khairpur',
      'Korangi',
      'Larkana',
      'Malir',
      'Matiari',
      'Mirpur Khas',
      'Naushahro Feroze',
      'Qambar Shahdadkot',
      'Sanghar',
      'Shaheed Benazirabad',
      'Shikarpur',
      'Sujawal',
      'Sukkur',
      'Tando Allahyar',
      'Tando Muhammad Khan',
      'Thatta',
      'Tharparkar',
      'Umerkot',
    ],
    'Balochistan': [
      'Awaran',
      'Barkhan',
      'Chagai',
      'Chaman',
      'Dera Bugti',
      'Duki',
      'Gwadar',
      'Harnai',
      'Hub',
      'Jafarabad',
      'Jhal Magsi',
      'Kachhi',
      'Kalat',
      'Kech',
      'Kharan',
      'Khuzdar',
      'Killa Abdullah',
      'Killa Saifullah',
      'Kohlu',
      'Lasbela',
      'Loralai',
      'Mastung',
      'Musakhel',
      'Nasirabad',
      'Nushki',
      'Panjgur',
      'Pishin',
      'Quetta',
      'Sherani',
      'Sibi',
      'Sohbatpur',
      'Surab',
      'Turbat',
      'Usta Muhammad',
      'Washuk',
      'Zhob',
      'Ziarat',
    ],
    'Khyber Pakhtunkhwa': [
      'Abbottabad',
      'Bajaur',
      'Bannu',
      'Battagram',
      'Buner',
      'Charsadda',
      'Central Dir',
      'Dera Ismail Khan',
      'Hangu',
      'Haripur',
      'Karak',
      'Khyber',
      'Kohat',
      'Kolai-Palas',
      'Kurram',
      'Lakki Marwat',
      'Lower Chitral',
      'Lower Dir',
      'Lower Kohistan',
      'Malakand',
      'Mansehra',
      'Mardan',
      'Mohmand',
      'North Waziristan',
      'Nowshera',
      'Orakzai',
      'Peshawar',
      'Shangla',
      'South Waziristan',
      'Swabi',
      'Swat',
      'Tank',
      'Torghar',
      'Upper Chitral',
      'Upper Dir',
      'Upper Kohistan',
    ],
    'Azad Jammu and Kashmir': [
      'Bagh',
      'Bhimber',
      'Haveli',
      'Jhelum Valley',
      'Kotli',
      'Mirpur',
      'Muzaffarabad',
      'Neelum',
      'Poonch',
      'Sudhanoti',
    ],
  };

  bool get _isOfficer => _requestedRole == 'officer';

  @override
  void initState() {
    super.initState();
    final user = FirebaseAuth.instance.currentUser;
    _nameController.text = user?.displayName ?? '';
    _phoneController.text = _phoneForForm(user?.phoneNumber);
    _checkPendingRequest();
  }

  String _phoneForForm(String? phone) {
    if (phone == null) return '';
    if (phone.startsWith('+92') && phone.length == 13) {
      return '0${phone.substring(3)}';
    }
    return phone;
  }

  Future<void> _checkPendingRequest() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }

    try {
      final pending = await _service.hasPendingRequest(uid);
      if (mounted) setState(() { _pending = pending; _loading = false; });
    } catch (error) {
      if (kDebugMode) {
        if (error is PostgrestException) {
          debugPrint(
            '[AccessRequestScreen] status check failed: '
            'code=${error.code}; message=${error.message}; '
            'details=${error.details}; hint=${error.hint}',
          );
        } else {
          debugPrint(
            '[AccessRequestScreen] status check failed: '
            '${error.runtimeType}: $error',
          );
        }
      }
      if (mounted) setState(() => _loading = false);
      _showMessage('Unable to check request status. Please try again.', true);
    }
  }

  Future<void> _submit() async {
    final user = FirebaseAuth.instance.currentUser;
    final values = [
      _nameController.text.trim(),
      _organizationController.text.trim(),
      _designationController.text.trim(),
      _phoneController.text.trim(),
      _reasonController.text.trim(),
    ];
    final officerValues = [
      _cnicController.text.trim(), _departmentController.text.trim(),
      _employeeIdController.text.trim(), _officialEmailController.text.trim(),
    ];
    final ngoValues = [
      _organizationTypeController.text.trim(), _registrationNumberController.text.trim(),
      _officialEmailController.text.trim(),
    ];
    if (user == null || values.any((value) => value.isEmpty) ||
        (_isOfficer && (officerValues.any((value) => value.isEmpty) || _province == null || _district == null)) ||
        (!_isOfficer && (ngoValues.any((value) => value.isEmpty) || _operationalProvince == null || _operationalDistrict == null))) {
      _showMessage('Please complete all fields.', true);
      return;
    }
    if (_isOfficer && !RegExp(r'^\d{5}-\d{7}-\d$').hasMatch(officerValues[0])) {
      _showMessage('Please enter CNIC as XXXXX-XXXXXXX-X.', true);
      return;
    }
    if (!RegExp(r'^03\d{9}$').hasMatch(values[3])) {
      _showMessage('Please enter an 11-digit phone number starting with 03.', true);
      return;
    }
    final officialEmail = _officialEmailController.text.trim();
    if (!RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(officialEmail)) {
      _showMessage('Please enter a valid official email address.', true);
      return;
    }

    setState(() => _submitting = true);
    try {
      await _service.submitRequest(
        uid: user.uid,
        requestedRole: _requestedRole,
        fullName: values[0],
        organizationName: values[1],
        designation: values[2],
        phone: values[3],
        reason: values[4],
        additionalFields: _isOfficer
            ? {
                'cnic': officerValues[0], 'province': _province, 'district': _district,
                'department': officerValues[1], 'employeeId': officerValues[2],
                'officialEmail': officerValues[3],
              }
            : {
                'organizationType': ngoValues[0], 'registrationNumber': ngoValues[1],
                'operationalProvince': _operationalProvince,
                'operationalDistrict': _operationalDistrict,
                'officialEmail': ngoValues[2],
              },
      );
      if (mounted) setState(() { _pending = true; _submitting = false; });
      if (mounted) _showMessage('Your request was submitted and is under review.', false);
    } catch (_) {
      if (mounted) setState(() => _submitting = false);
      _showMessage('Unable to submit your request. Please try again.', true);
    }
  }

  void _showMessage(String message, bool error) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(message),
      backgroundColor: error ? Colors.red : const Color(0xFF2E7D32),
    ));
  }

  InputDecoration _decoration(String label) => InputDecoration(
    labelText: label,
    filled: true,
    fillColor: const Color(0xFFF6FAF7),
    contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 17),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: const BorderSide(color: Color(0xFFDCE9DF)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: const BorderSide(color: Color(0xFF2E7D32), width: 2),
    ),
  );

  Widget _field(TextEditingController controller, String label,
      {TextInputType? keyboardType, List<TextInputFormatter>? formatters}) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      inputFormatters: formatters,
      decoration: _decoration(label),
    );
  }

  Widget _dropdown(String label, String? value, List<String> items,
      ValueChanged<String?> onChanged) {
    return DropdownButtonFormField<String>(
      initialValue: value,
      decoration: _decoration(label),
      items: items.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
      onChanged: onChanged,
    );
  }

  String _label(String english, String urdu) =>
      LocalStorageService.getLanguage() == 'ur' ? urdu : english;

  @override
  Widget build(BuildContext context) {
    const green = Color(0xFF2E7D32);

    return Scaffold(
      backgroundColor: const Color(0xFFF7FBF8),
      appBar: AppBar(
        title: Text(_label('Access Request Form', 'رسائی کی درخواست کا فارم')),
        backgroundColor: green,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: green))
          : _pending
              ? Center(
                  child: Container(
                    margin: const EdgeInsets.all(24),
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFDCE9DF)),
                    ),
                    child: const Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Iconsax.clock, size: 48, color: green),
                        SizedBox(height: 16),
                        Text(
                          'Request pending review',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Your request has been received. We will review it and update your access when approved.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.black54, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: const EdgeInsets.fromLTRB(20, 22, 20, 32),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        color: green,
                        borderRadius: BorderRadius.circular(22),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.16),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Iconsax.shield_tick, color: Colors.white, size: 30),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              _label('Request Officer or Organization Access', 'افسر یا تنظیمی رسائی کی درخواست دیں'),
                              style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700, height: 1.2),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),
                    Text(_label('Choose access type', 'رسائی کی قسم منتخب کریں'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                    const SizedBox(height: 8),
                    _roleOption('officer', _label('PDMA Officer', 'پی ڈی ایم اے افسر')),
                    _roleOption('ngo', _label('NGO / Organization', 'این جی او / تنظیم')),
                    const SizedBox(height: 18),
                    Text(_label('Personal information', 'ذاتی معلومات'), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
                    const SizedBox(height: 12),
                    _field(_nameController, _label('Full name', 'پورا نام')),
                    const SizedBox(height: 14),
                    _field(_organizationController, _label('Organization or department name', 'ادارے یا تنظیم کا نام')),
                    const SizedBox(height: 14),
                    _field(_designationController, _label('Designation / title', 'عہدہ')),
                    const SizedBox(height: 14),
                    _field(_phoneController, _label('Contact phone number', 'رابطہ فون نمبر'), keyboardType: TextInputType.phone, formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(11)]),
                    const SizedBox(height: 14),
                    if (_isOfficer) ...[
                      _field(_cnicController, _label('CNIC', 'شناختی کارڈ نمبر'), keyboardType: TextInputType.number, formatters: [FilteringTextInputFormatter.digitsOnly, _CnicFormatter()]),
                      const SizedBox(height: 14),
                      _dropdown(_label('Province', 'صوبہ'), _province, _provinces, (value) => setState(() { _province = value; _district = null; })),
                      const SizedBox(height: 14),
                      _dropdown(_label('District', 'ضلع'), _district, _districts[_province] ?? const [], (value) => setState(() => _district = value)),
                      const SizedBox(height: 14),
                      _field(_departmentController, _label('Department / unit', 'مح বিভাগ / یونٹ')),
                      const SizedBox(height: 14),
                      _field(_employeeIdController, _label('Employee / official ID', 'ملازم / سرکاری شناخت')),
                      const SizedBox(height: 14),
                      _field(_officialEmailController, _label('Official email', 'سرکاری ای میل'), keyboardType: TextInputType.emailAddress),
                    ] else ...[
                      _field(_organizationTypeController, _label('Organization type', 'تنظیم کی قسم')),
                      const SizedBox(height: 14),
                      _field(_registrationNumberController, _label('Registration number', 'رجسٹریشن نمبر')),
                      const SizedBox(height: 14),
                      _dropdown(_label('Operational province', 'آپریشنل صوبہ'), _operationalProvince, _provinces, (value) => setState(() { _operationalProvince = value; _operationalDistrict = null; })),
                      const SizedBox(height: 14),
                      _dropdown(_label('Operational district', 'آپریشنل ضلع'), _operationalDistrict, _districts[_operationalProvince] ?? const [], (value) => setState(() => _operationalDistrict = value)),
                      const SizedBox(height: 14),
                      _field(_officialEmailController, _label('Official email', 'سرکاری ای میل'), keyboardType: TextInputType.emailAddress),
                    ],
                    const SizedBox(height: 14),
                    _field(_reasonController, _label('Reason / justification', 'وجہ / وضاحت')),
                    const SizedBox(height: 26),
                    SizedBox(
                      width: double.infinity,
                      height: 58,
                      child: ElevatedButton.icon(
                        onPressed: _submitting ? null : _submit,
                        icon: _submitting ? const SizedBox.shrink() : const Icon(Iconsax.send_2),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: green,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: Colors.grey.shade300,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        label: _submitting ? const CircularProgressIndicator(color: Colors.white) : Text(_label('Submit Request', 'درخواست جمع کروائیں')),
                      ),
                    ),
                  ]),
                ),
    );
  }


  Widget _roleOption(String value, String label) {
    final selected = _requestedRole == value;

    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => setState(() => _requestedRole = value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFE8F5E9) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? const Color(0xFF2E7D32) : const Color(0xFFDCE9DF),
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              selected ? Iconsax.tick_circle : Iconsax.record_circle,
              color: selected ? const Color(0xFF2E7D32) : Colors.grey.shade500,
            ),
            const SizedBox(width: 10),
            Text(
              label,
              style: TextStyle(
                color: selected ? const Color(0xFF1B5E20) : Colors.black87,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
  @override
  void dispose() {
    _nameController.dispose();
    _organizationController.dispose();
    _designationController.dispose();
    _phoneController.dispose();
    _reasonController.dispose();
    _cnicController.dispose();
    _departmentController.dispose();
    _employeeIdController.dispose();
    _officialEmailController.dispose();
    _organizationTypeController.dispose();
    _registrationNumberController.dispose();
    super.dispose();
  }
}
