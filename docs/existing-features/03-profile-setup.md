# Section 4: Candidate's Profile Setup

**PDF Section:** 4. Candidate's profile setup (p. 8-9)
**Feature Count:** 8 profile configuration features

---

## Features Extracted

### CP-1: Default Profile Information Fields
**Functionality:** The system allows populating default Profile Information fields:
- Profile Picture
- Gender
- First Name
- Last Name
- Personnel Type (Role - to be added by administrator at invite stage)
- Grade
- Medical Category
- Specialty
- Date of Birth

**Type:** Data Model (Core Fields)
**User Facing:** Candidate (data entry), Admin (configuration)
**Configurable:** No (hardcoded fields)

---

### CP-2: Default Contact Details Fields
**Functionality:** The system allows populating default Contact Details fields:
- Phone Number
- Additional Email 1
- Additional Email 2
- Address
  - Country
  - Address Line 1
  - Address Line 2
  - Town/City
  - County
  - Postcode

**Type:** Data Model (Core Fields)
**User Facing:** Candidate (data entry)
**Configurable:** No (hardcoded fields)

---

### CP-5: Add Custom Sections to Candidate's Profile
**Functionality:** The system allows adding custom sections to the candidate's profile

**Type:** Data Model (Extension)
**User Facing:** Admin (configuration), Candidate (sees sections)
**Configurable:** Yes (self-service)

---

### CP-6: Configure Custom Section Parameters
**Functionality:** The system requires configuring the following information for each additional custom section:
- **Name**
- **Description**
- **Whether section is sensitive or not** (if sensitive, then only users with corresponding permission can view and edit)
- **Access to section by role**
- **Access to section restricted for profile owner** (if restricted, is hidden from profile owner)

**Type:** Configuration (Access Control)
**User Facing:** Admin
**Configurable:** Yes (self-service)
**Supports:** Sensitive data controls, role-based visibility, hide-from-owner

---

### CP-7: Add Custom Fields to Candidate's Profile
**Functionality:** The system allows adding custom fields to the candidate's profile

**Type:** Data Model (Extension) - CORE PRIMITIVE
**User Facing:** Admin (configuration), Candidate (sees fields)
**Configurable:** Yes (self-service)

---

### CP-8: Configure Custom Field Parameters
**Functionality:** The system requires configuring the following information for each additional custom field:

**Field Configuration Options:**
- **Name**
- **Description**
- **Type:**
  - Short Text (100 characters)
  - Long Text (2048 characters)
  - Number
  - Phone
  - Email
  - Date
  - Address
  - Checkbox
  - Single choice (includes "Other" option if needed)
  - Multiple choice
- **Uniqueness within the organisation** (if supported by Type)
- **Required/optional**
- **Options** (if supported by Type)
- **Mask entered values** (if supported by Type)
- **Conditional fields:**
  - Field becomes visible only if specific value in the preceding field is selected
  - Field contains a different set of values depending on the selection made in the preceding field
- **Validations:**
  - Allowed characters
  - Min/max number of characters

**Type:** Configuration (Data Model Extension) - CORE PRIMITIVE
**User Facing:** Admin
**Configurable:** Yes (self-service)
**Advanced Features:**
- Conditional logic
- Field dependencies
- Validation rules
- Data masking

---

## Configuration Notes

**4.2:** The default fields will be used accordingly to a customer's request

**4.3:** Custom fields will be configured accordingly to the customer's requests:
- 4.3.1: Fields can be assigned to custom sections as needed
- 4.3.2: Access to the fields can be restricted for profile owner as needed
- 4.3.3: Other parameters can be configured as needed

---

## Summary

**Total Features:** 8

**Hardcoded Fields:** 2 (CP-1, CP-2)
**Custom/Configurable:** 4 (CP-5, CP-6, CP-7, CP-8)

**Field Types Supported:** 10
- Text (short, long)
- Number
- Phone
- Email
- Date
- Address
- Checkbox
- Single choice
- Multiple choice

**Advanced Capabilities:**
- Conditional field logic (show/hide based on other field values)
- Dependent dropdowns (options change based on other field)
- Validation rules (character limits, allowed characters)
- Data masking (for sensitive fields)
- Uniqueness constraints
- Required/optional configuration
- Role-based visibility
- Hide from profile owner

**Key Primitive Mapping:**
- **CP-7 + CP-8 = P001 (Custom Entity Fields/Metadata)** - This is the most frequently requested primitive (68 mentions across Notion feedback)
- Supports both simple custom fields AND advanced conditional logic
