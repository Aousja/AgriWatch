import 'app_design.dart';

/// Display-only translations. Stored categories, statuses and CMP IDs stay intact.
class WorkflowCopy {
  static String text(String english) =>
      AppCopy.isUrdu ? (_urdu[english] ?? english) : english;

  static const _urdu = {
    'Retry': 'دوبارہ کوشش کریں',
    'Profile unavailable': 'پروفائل دستیاب نہیں',
    'We could not load your profile. Check your connection and retry.':
        'آپ کا پروفائل لوڈ نہیں ہو سکا۔ انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔',
    'Your profile could not be found. Retry to recover your account.':
        'آپ کا پروفائل نہیں مل سکا۔ اپنا اکاؤنٹ بحال کرنے کے لیے دوبارہ کوشش کریں۔',
    'Profile Setup': 'پروفائل بنائیں',
    'Tell us about you': 'اپنے بارے میں بتائیں',
    'This helps us personalize your AgriWatch experience.':
        'یہ ایگری واچ کو آپ کی ضروریات کے مطابق بنانے میں مدد کرتا ہے۔',
    'Please enter your name and select your role.':
        'براہ کرم اپنا نام درج کریں اور کردار منتخب کریں۔',
    'Unable to save profile. Your entries are kept. Please retry.':
        'پروفائل محفوظ نہیں ہو سکا۔ آپ کی درج کردہ معلومات برقرار ہیں۔ دوبارہ کوشش کریں۔',
    'Continue': 'جاری رکھیں',
    'Edit profile': 'پروفائل میں ترمیم کریں',
    'Full Name': 'پورا نام',
    'District (optional)': 'ضلع (اختیاری)',
    'District': 'ضلع',
    'Contact phone': 'رابطے کا فون نمبر',
    'Contact email': 'رابطے کی ای میل',
    'Profile photo URL (optional)': 'پروفائل تصویر کا لنک (اختیاری)',
    'These contact details do not change how you sign in.':
        'یہ رابطے کی معلومات آپ کے سائن اِن کرنے کا طریقہ تبدیل نہیں کرتیں۔',
    'Save changes': 'تبدیلیاں محفوظ کریں',
    'Profile saved': 'پروفائل محفوظ ہو گیا',
    'Please enter your name.': 'براہ کرم اپنا نام درج کریں۔',
    'Please enter a valid email address.': 'درست ای میل درج کریں۔',
    'Please enter a valid phone number.': 'درست فون نمبر درج کریں۔',
    'Please enter an https image URL.': 'تصویر کا درست https لنک درج کریں۔',
    'A district is required for this report.': 'اس رپورٹ کے لیے ضلع ضروری ہے۔',
    'Add district': 'ضلع شامل کریں',
    'Edit district': 'ضلع میں ترمیم کریں',
    'District not set': 'ضلع درج نہیں',
    'Add your district in your profile, then return here. Your report text will be kept.':
        'پروفائل میں اپنا ضلع شامل کر کے یہاں واپس آئیں۔ آپ کی رپورٹ کا متن برقرار رہے گا۔',
    'Report Drought Situation': 'خشک سالی کی صورتحال رپورٹ کریں',
    'Report a drought situation affecting your area. AgriWatch admins receive and review every new report.':
        'اپنے علاقے میں خشک سالی کی صورتحال رپورٹ کریں۔ نئی رپورٹس ایگری واچ ایڈمن کے جائزے کے لیے جمع ہوتی ہیں۔',
    'Routine farming advice is not available in this mobile app. Use this form for drought situations.':
        'اس موبائل ایپ میں معمول کے زرعی مشورے دستیاب نہیں۔ یہ فارم خشک سالی کی صورتحال کے لیے استعمال کریں۔',
    'DISTRICT': 'ضلع',
    'DROUGHT REPORT CATEGORY': 'خشک سالی کی رپورٹ کی قسم',
    'Select a category': 'رپورٹ کی قسم منتخب کریں',
    'CROP TYPE (OPTIONAL)': 'فصل کی قسم (اختیاری)',
    'Choose crop type': 'فصل کی قسم منتخب کریں',
    'DESCRIBE THE DROUGHT SITUATION': 'خشک سالی کی صورتحال بیان کریں',
    'Please explain what happened, where it happened, and any relevant details.':
        'بتائیں کہ کیا ہوا، کہاں ہوا، اور متعلقہ تفصیلات درج کریں۔',
    'Please add at least 10 characters of detail.':
        'براہ کرم کم از کم ۱۰ حروف میں تفصیل درج کریں۔',
    'Submit report': 'رپورٹ جمع کریں',
    'Submitting report…': 'رپورٹ جمع ہو رہی ہے…',
    'Report submitted': 'رپورٹ جمع ہو گئی',
    'Your report has been recorded for AgriWatch admin review. Track stored updates here.':
        'آپ کی رپورٹ ایگری واچ ایڈمن کے جائزے کے لیے محفوظ ہو گئی ہے۔ درج شدہ اپ ڈیٹس یہاں دیکھیں۔',
    'View report': 'رپورٹ دیکھیں',
    'Report not submitted. Your entries are kept. Check your connection and retry.':
        'رپورٹ جمع نہیں ہو سکی۔ آپ کی درج کردہ معلومات برقرار ہیں۔ انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔',
    'Could not confirm submission. Your entries are kept. Check report tracking before retrying.':
        'رپورٹ جمع ہونے کی تصدیق نہیں ہو سکی۔ آپ کی معلومات برقرار ہیں۔ دوبارہ کوشش سے پہلے رپورٹ کی پیروی چیک کریں۔',
    'Check report tracking': 'رپورٹ کی پیروی چیک کریں',
    'Drought reporting is unavailable until the required database update is completed. Your entries are kept.':
        'ضروری ڈیٹابیس اپ ڈیٹ مکمل ہونے تک رپورٹ جمع کرنا دستیاب نہیں۔ آپ کی درج کردہ معلومات برقرار ہیں۔',
    'Drought report tracking': 'خشک سالی کی رپورٹ کی پیروی',
    'Refresh reports': 'رپورٹس تازہ کریں',
    'Filter': 'فلٹر',
    'Filter by status': 'حالت کے مطابق فلٹر کریں',
    'All statuses': 'تمام حالتیں',
    'Clear search and filters': 'تلاش اور فلٹر صاف کریں',
    'Could not load reports': 'رپورٹس لوڈ نہیں ہو سکیں',
    'Please check your connection and retry.':
        'انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔',
    'Search by Ticket ID or Topic...': 'ٹکٹ نمبر یا موضوع سے تلاش کریں…',
    'Clear search': 'تلاش صاف کریں',
    'RECENT SUBMISSIONS': 'حالیہ رپورٹس',
    'View History': 'سابقہ رپورٹس دیکھیں',
    'Report history': 'رپورٹس کی تاریخ',
    'No drought reports yet': 'ابھی خشک سالی کی کوئی رپورٹ نہیں',
    'Your drought reports and recorded updates will appear here.':
        'آپ کی خشک سالی کی رپورٹس اور درج شدہ اپ ڈیٹس یہاں ظاہر ہوں گی۔',
    'No matching reports': 'کوئی متعلقہ رپورٹ نہیں ملی',
    'Try another ticket ID, topic, or status.':
        'دوسرا ٹکٹ نمبر، موضوع یا حالت منتخب کریں۔',
    'Active drought reports': 'فعال خشک سالی کی رپورٹس',
    'Track recorded updates to your reports.':
        'اپنی رپورٹس کی درج شدہ اپ ڈیٹس دیکھیں۔',
    'Total active': 'کل فعال',
    'Need attention': 'توجہ درکار',
    'Drought report details': 'خشک سالی کی رپورٹ کی تفصیلات',
    'Refresh status': 'حالت تازہ کریں',
    'Could not load report': 'رپورٹ لوڈ نہیں ہو سکی',
    'Submitted': 'جمع شدہ',
    'Updated': 'تازہ ترین تبدیلی',
    'Assigned for PDMA review': 'پی ڈی ایم اے کے جائزے کے لیے تفویض شدہ',
    'AgriWatch review started': 'ایگری واچ کا جائزہ شروع ہو گیا',
    'In Progress': 'کارروائی جاری ہے',
    'Resolved': 'حل شدہ',
    'Rejected': 'مسترد شدہ',
    'Legacy status: Forwarded': 'پرانی حالت: آگے بھیجی گئی',
    'REPORT DETAILS': 'رپورٹ کی تفصیلات',
    'Category': 'قسم',
    'Crop type': 'فصل کی قسم',
    'Description': 'تفصیل',
    'PDMA response': 'پی ڈی ایم اے کا جواب',
    'AgriWatch admin response': 'ایگری واچ ایڈمن کا جواب',
    'Recorded response': 'درج شدہ جواب',
    'TRACKING PROGRESS': 'رپورٹ کی پیش رفت',
    'Support is not available in this app.':
        'اس ایپ میں رابطہ مدد دستیاب نہیں۔',
    'Evidence image unavailable': 'ثبوت کی تصویر دستیاب نہیں',
    'Report received': 'رپورٹ موصول ہو گئی',
    'Recorded for AgriWatch admin review.':
        'ایگری واچ ایڈمن کے جائزے کے لیے محفوظ ہے۔',
    'Report recorded by AgriWatch.': 'ایگری واچ نے رپورٹ محفوظ کر لی ہے۔',
    'An admin recorded a review action.':
        'ایڈمن نے جائزے کی کارروائی درج کی ہے۔',
    'An admin explicitly assigned this report to a verified PDMA reviewer. This does not confirm government action.':
        'ایڈمن نے یہ رپورٹ تصدیق شدہ پی ڈی ایم اے جائزہ کار کو تفویض کی ہے۔ اس سے حکومتی کارروائی کی تصدیق نہیں ہوتی۔',
    'PDMA review started': 'پی ڈی ایم اے کا جائزہ شروع ہو گیا',
    'The assigned PDMA reviewer recorded a review action.':
        'مقررہ پی ڈی ایم اے جائزہ کار نے جائزے کی کارروائی درج کی ہے۔',
    'PDMA response recorded': 'پی ڈی ایم اے کا جواب درج ہو گیا',
    'Resolution recorded': 'حل درج ہو گیا',
    'An authorized reviewer recorded resolution.':
        'مجاز جائزہ کار نے حل درج کیا ہے۔',
    'Legacy resolution status': 'حل کی پرانی حالت',
    'The stored status is Resolved; no completion time was recorded.':
        'محفوظ حالت حل شدہ ہے؛ تکمیل کا وقت درج نہیں ہے۔',
    'No verified PDMA assignment is recorded by this status alone.':
        'صرف اس حالت سے تصدیق شدہ پی ڈی ایم اے تفویض ثابت نہیں ہوتی۔',
    'Awaiting AgriWatch review': 'ایگری واچ کے جائزے کا انتظار',
    'No review action has been recorded yet.':
        'ابھی جائزے کی کوئی کارروائی درج نہیں ہوئی۔',
    'Awaiting update': 'اپ ڈیٹ کا انتظار',
    'Prolonged water shortage affecting an area or multiple farms':
        'کسی علاقے یا کئی کھیتوں کو متاثر کرنے والی طویل پانی کی کمی',
    'Observed drought conditions affecting a community':
        'کسی آبادی کو متاثر کرنے والی خشک سالی کے مشاہدہ شدہ حالات',
    'Incorrect or missing AgriWatch drought alert':
        'ایگری واچ کا غلط یا غائب خشک سالی کا انتباہ',
    'Other drought-related situation': 'خشک سالی سے متعلق دوسری صورتحال',
    'Wheat': 'گندم',
    'Rice': 'چاول',
    'Cotton': 'کپاس',
    'Sugarcane': 'گنا',
    'Maize': 'مکئی',
    'Other': 'دیگر',
    'AgriWatch user': 'ایگری واچ صارف',
    'Not provided': 'درج نہیں',
    'Mobile number': 'موبائل نمبر',
    'Email': 'ای میل',
    'Farmer': 'کسان',
    'Citizen': 'عام شہری',
    'PDMA Officer': 'پی ڈی ایم اے افسر',
    'Administrator': 'منتظم',
    'NGO / Organization': 'این جی او / تنظیم',
    'Personal Information': 'ذاتی معلومات',
    'Personal information': 'ذاتی معلومات',
    'Settings & Account': 'ترتیبات اور اکاؤنٹ',
    'Help Center & Support': 'مدد اور معاونت',
    'Help & FAQ': 'مدد اور عام سوالات',
    'Refer a Farmer': 'کسان کو دعوت دیں',
    'About AgriWatch': 'ایگری واچ کے بارے میں',
    'District & region': 'ضلع اور علاقہ',
    'Sign out': 'سائن آؤٹ',
    'Account': 'اکاؤنٹ',
    'Change phone number': 'فون نمبر تبدیل کریں',
    'Linked Sign-In Methods': 'منسلک سائن اِن طریقے',
    'Access': 'رسائی',
    'Refresh account access': 'اکاؤنٹ کی رسائی تازہ کریں',
    'Request Officer/Organization Access': 'افسر / تنظیم کی رسائی کی درخواست',
    'Preferences': 'ترجیحات',
    'App Language': 'ایپ کی زبان',
    'Notifications': 'اطلاعات',
    'Security': 'حفاظت',
    'Privacy & Security': 'رازداری اور حفاظت',
    'Settings': 'ترتیبات',
    'Urdu': 'اردو',
    'English': 'انگریزی',
    'Unavailable in this app': 'اس ایپ میں دستیاب نہیں',
    'This option is not available in this app.':
        'یہ سہولت اس ایپ میں دستیاب نہیں۔',
  };
}
