<?PHP
/*
Simfatic Forms Main Form processor script

This script does all the server side processing. 
(Displaying the form, processing form submissions,
displaying errors, making CAPTCHA image, and so on.) 

All pages (including the form page) are displayed using 
templates in the 'templ' sub folder. 

The overall structure is that of a list of modules. Depending on the 
arguments (POST/GET) passed to the script, the modules process in sequence. 

Please note that just appending  a header and footer to this script won't work.
To embed the form, use the 'Copy & Paste' code in the 'Take the Code' page. 
To extend the functionality, see 'Extension Modules' in the help.

*/

@ini_set("display_errors", 1);//the error handler is added later in FormProc
error_reporting(E_ALL);

require_once(dirname(__FILE__)."/includes/RentalContractVer2-lib.php");
$formproc_obj =  new SFM_FormProcessor('RentalContractVer2');
$formproc_obj->initTimeZone('default');
$formproc_obj->setFormID('b0f1fd71-ed37-4f66-9d57-a49be19e2e5c');
$formproc_obj->setRandKey('ece2b330-9db1-4e92-9891-040b90daea35');
$formproc_obj->setFormKey('eb591cc4-1c98-4cb3-adab-453caa0f4a4c');
$formproc_obj->setLocale('en-CA','dd/MM/yyyy');
$formproc_obj->setEmailFormatHTML(true);
$formproc_obj->EnableLogging(false);
$formproc_obj->SetDebugMode(false);
$formproc_obj->setIsInstalled(true);
$formproc_obj->SetPrintPreviewPage(sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_print_preview_file.txt"));
$formproc_obj->SetSingleBoxErrorDisplay(true);
$formproc_obj->setFormPage(0,sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_form_page_0.txt"));
$formproc_obj->AddElementInfo('Name','text','');
$formproc_obj->AddElementInfo('Address','text','');
$formproc_obj->AddElementInfo('Phone','telephone','');
$formproc_obj->AddElementInfo('Email','email','');
$formproc_obj->AddElementInfo('DatePicker','datepicker','');
$formproc_obj->AddElementInfo('Event','text','');
$formproc_obj->AddElementInfo('StartTime','text','');
$formproc_obj->AddElementInfo('Duration','text','');
$formproc_obj->AddElementInfo('Memb_Card_No','decimal','');
$formproc_obj->AddElementInfo('DropdownList','listbox','');
$formproc_obj->AddElementInfo('No_Guests','decimal','');
$formproc_obj->AddElementInfo('Lounge_hrs','decimal','');
$formproc_obj->AddElementInfo('CheckBoxSingle','single_chk','');
$formproc_obj->AddElementInfo('CheckBoxSingle1','single_chk','');
$formproc_obj->AddElementInfo('Hidden7','hidden','');
$formproc_obj->AddElementInfo('Place','decimal','');
$formproc_obj->AddElementInfo('Cloths','decimal','');
$formproc_obj->AddElementInfo('Naps','decimal','');
$formproc_obj->AddElementInfo('SubTotal','calcfield','');
$formproc_obj->AddElementInfo('Hidden','hidden','');
$formproc_obj->AddElementInfo('GST','calcfield','');
$formproc_obj->AddElementInfo('Hidden1','hidden','');
$formproc_obj->AddElementInfo('Total','calcfield','');
$formproc_obj->AddElementInfo('Hidden2','hidden','');
$formproc_obj->AddElementInfo('DamageDep','calcfield','');
$formproc_obj->AddElementInfo('TotalRentChg','calcfield','');
$formproc_obj->AddElementInfo('Hidden3','hidden','');
$formproc_obj->AddElementInfo('Lounge','calcfield','');
$formproc_obj->AddElementInfo('Hidden4','hidden','');
$formproc_obj->AddElementInfo('StoveOven','calcfield','');
$formproc_obj->AddElementInfo('KeepWarm','calcfield','');
$formproc_obj->AddElementInfo('Hidden5','hidden','');
$formproc_obj->AddElementInfo('PlaceSetting','calcfield','');
$formproc_obj->AddElementInfo('Hidden6','hidden','');
$formproc_obj->AddElementInfo('TableCloths','calcfield','');
$formproc_obj->AddElementInfo('Napkins','calcfield','');
$formproc_obj->AddDefaultValue('Hidden7','35');
$formproc_obj->AddDefaultValue('Hidden','130');
$formproc_obj->AddDefaultValue('Hidden1','75');
$formproc_obj->AddDefaultValue('Hidden2','1.00');
$formproc_obj->AddDefaultValue('Hidden3','6.00');
$formproc_obj->AddDefaultValue('Hidden4','.50');
$formproc_obj->AddDefaultValue('Hidden5','.05');
$formproc_obj->AddDefaultValue('Hidden6','200');
$formproc_obj->SetHiddenInputTrapVarName('t90bdef1b1dc5de4cfe29');
$formproc_obj->SetFromAddress('<mprozny@gmail.com>');
$page_renderer =  new FM_FormPageDisplayModule();
$formproc_obj->addModule($page_renderer);

$validator =  new FM_FormValidator();
$validator->addValidation("Email","email","The input for  should be a valid email value");
$validator->addValidation("Memb_Card_No","numeric","The input for  should be a valid numeric value");
$validator->addValidation("No_Guests","numeric","The input for  should be a valid numeric value");
$validator->addValidation("Lounge_hrs","numeric","The input for  should be a valid numeric value");
$validator->addValidation("Place","numeric","The input for  should be a valid numeric value");
$validator->addValidation("Cloths","numeric","The input for  should be a valid numeric value");
$validator->addValidation("Naps","numeric","The input for  should be a valid numeric value");
$formproc_obj->addModule($validator);

$confirmpage =  new FM_ConfirmPage(sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_confirm_page.txt"));
$confirmpage->SetButtonCode(sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_confirm_button_code.txt"),sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_edit_button_code.txt"),sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_print_button_code.txt"));
$formproc_obj->addModule($confirmpage);

$data_email_sender =  new FM_FormDataSender(sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_email_subj.txt"),sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_email_body.txt"),'%Email%');
$data_email_sender->AddToAddr('forms@squamishlegion.ca');
$data_email_sender->AddToAddr('Moe <mprozny@gmail.com>');
$formproc_obj->addModule($data_email_sender);

$autoresp =  new FM_AutoResponseSender(sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_resp_subj.txt"),sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_resp_body.txt"));
$autoresp->SetToVariables('Name','Email');
$formproc_obj->addModule($autoresp);

$tupage =  new FM_ThankYouPage(sfm_readfile(dirname(__FILE__)."/templ/RentalContractVer2_thank_u.txt"));
$formproc_obj->addModule($tupage);

$page_renderer->SetFormValidator($validator);
$formproc_obj->ProcessForm();

?>