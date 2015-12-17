import * as Colors from 'material-ui/lib/styles/colors';
import * as ColorManipulator from 'material-ui/lib/utils/color-manipulator';
import * as Spacing from 'material-ui/lib/styles/spacing';

/*
 *  Light Theme is the default theme used in material-ui. It is guaranteed to
 *  have all theme variables needed for every component. Variables not defined
 *  in a custom theme will default to these values.
 */

export = {
  spacing: Spacing,
  fontFamily: 'Roboto, sans-serif',
  palette: {
    primary1Color: Colors.lightGreen500,
    primary2Color: Colors.lightGreen700,
    primary3Color: Colors.grey400,
    accent1Color: Colors.green500,
    accent2Color: Colors.grey100,
    accent3Color: Colors.grey500,
    textColor: Colors.darkBlack,
    alternateTextColor: Colors.white,
    canvasColor: Colors.white,
    borderColor: Colors.grey300,
    disabledColor: ColorManipulator.fade(Colors.darkBlack, 0.3)
  }
};
